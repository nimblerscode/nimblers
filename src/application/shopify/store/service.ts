import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyStoreService } from "@/domain/shopify/store/service";
import { StoreNotFoundError } from "@/domain/shopify/store/models";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { DrizzleD1Client } from "@/infrastructure/persistence/global/d1/drizzle";
import { organization } from "@/infrastructure/persistence/global/d1/schema";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ConnectedStore } from "@/domain/tenant/organization/model";

// Environment dependencies
export abstract class ShopifyStoreEnv extends Context.Tag(
  "@infrastructure/shopify/store/Env"
)<
  ShopifyStoreEnv,
  {
    ORG_DO: DurableObjectNamespace;
  }
>() {}

export const ShopifyStoreServiceLive = Layer.effect(
  ShopifyStoreService,
  Effect.gen(function* () {
    const env = yield* ShopifyStoreEnv;
    const drizzleClient = yield* DrizzleD1Client;
    const globalShopService = yield* GlobalShopConnectionUseCase;

    const getAllOrganizationSlugs = () =>
      Effect.gen(function* () {
        const organizations = yield* Effect.tryPromise({
          try: () => drizzleClient.select().from(organization),
          catch: (error) =>
            new Error(`Failed to fetch organizations: ${error}`),
        });

        return organizations.map((org) => org.slug as OrganizationSlug);
      });

    // ⚡ OPTIMIZED: Direct O(1) lookup using GlobalShopConnectionRepo
    const findOrganizationByShop = (shopDomain: ShopDomain) =>
      Effect.gen(function* () {
        yield* Effect.log("🔍⚡ Using optimized shop lookup", {
          shopDomain,
          method: "Direct D1 query (O1)",
        });

        // Direct lookup in the global shop_connection table
        const shopConnection = yield* globalShopService
          .checkShopConnection(shopDomain)
          .pipe(
            Effect.mapError(
              (error) =>
                new StoreNotFoundError({
                  message: `Failed to lookup shop connection: ${error.message}`,
                  shopDomain,
                })
            )
          );

        if (!shopConnection) {
          yield* Effect.log("❌ No shop connection found", {
            shopDomain,
          });
          return yield* Effect.fail(
            new StoreNotFoundError({
              message: "Store not found in global registry",
              shopDomain,
            })
          );
        }

        if (!shopConnection.organizationSlug) {
          yield* Effect.log("⚠️ Found stale shop connection record", {
            shopDomain,
            organizationSlug: shopConnection.organizationSlug,
          });
          return yield* Effect.fail(
            new StoreNotFoundError({
              message:
                "Shop connection exists but organization slug is missing (stale record)",
              shopDomain,
            })
          );
        }

        yield* Effect.log("✅ Found organization for shop", {
          shopDomain,
          organizationSlug: shopConnection.organizationSlug,
          method: "Direct lookup",
        });

        return shopConnection.organizationSlug;
      });

    // Store connection operations
    const checkConnectionStatus = (
      organizationSlug: OrganizationSlug,
      shopDomain: ShopDomain
    ) =>
      Effect.gen(function* () {
        yield* Effect.log("🔍 Checking connection status", {
          organizationSlug,
          shopDomain,
        });

        const doId = env.ORG_DO.idFromName(organizationSlug);
        const stub = env.ORG_DO.get(doId);

        const client = yield* createOrganizationDOClient(stub);
        const stores = yield* client.organizations
          .getConnectedStores({
            path: { organizationSlug },
          })
          .pipe(
            Effect.mapError(
              (error) => new Error(`Failed to get connected stores: ${error}`)
            )
          );

        const store = stores.find((s) => s.shopDomain === shopDomain);
        const connected = store?.status === "active";

        yield* Effect.log("🔍 Connection status result", {
          organizationSlug,
          shopDomain,
          connected,
          scope: store?.scope,
        });

        return {
          connected,
          scope: store?.scope || undefined,
        };
      }).pipe(Effect.provide(FetchHttpClient.layer));

    const getConnectedStores = (organizationSlug: OrganizationSlug) =>
      Effect.gen(function* () {
        yield* Effect.log("📋 Getting connected stores", {
          organizationSlug,
        });

        const doId = env.ORG_DO.idFromName(organizationSlug);
        const stub = env.ORG_DO.get(doId);

        const client = yield* createOrganizationDOClient(stub);
        const stores = yield* client.organizations
          .getConnectedStores({
            path: { organizationSlug },
          })
          .pipe(
            Effect.mapError(
              (error) => new Error(`Failed to get connected stores: ${error}`)
            )
          );

        yield* Effect.log("📋 Retrieved connected stores", {
          organizationSlug,
          storeCount: stores.length,
        });

        return stores as readonly ConnectedStore[];
      }).pipe(Effect.provide(FetchHttpClient.layer));

    // Unified store disconnection
    const disconnectStore = (
      organizationSlug: OrganizationSlug,
      shopDomain: ShopDomain
    ) =>
      Effect.gen(function* () {
        yield* Effect.log("🔌 Disconnecting store", {
          organizationSlug,
          shopDomain,
        });

        const doId = env.ORG_DO.idFromName(organizationSlug);
        const stub = env.ORG_DO.get(doId);

        const client = yield* createOrganizationDOClient(stub);
        const result = yield* client.organizations
          .disconnectStore({
            path: { shopDomain },
          })
          .pipe(
            Effect.mapError(
              (error) => new Error(`Failed to disconnect store: ${error}`)
            )
          );

        yield* Effect.log("🔌 Disconnect result", {
          organizationSlug,
          shopDomain,
          success: result.success,
        });

        return { success: result.success };
      }).pipe(Effect.provide(FetchHttpClient.layer));

    return {
      getAllOrganizationSlugs,
      findOrganizationByShop,
      checkConnectionStatus,
      getConnectedStores,
      disconnectStore,
    };
  })
);

// Complete webhook processing use case
export const WebhookProcessingUseCaseLive = Layer.effect(
  Context.GenericTag<{
    readonly processAppUninstallWebhook: (
      shopDomain: ShopDomain,
      webhookId: string
    ) => Effect.Effect<
      {
        organizationSlug: string;
        disconnected: boolean;
        globalCleanup: boolean;
      },
      Error,
      DrizzleD1Client
    >;
  }>("@application/shopify/webhooks/ProcessingUseCase"),
  Effect.gen(function* () {
    const storeManagement = yield* ShopifyStoreService;
    const globalShopService = yield* GlobalShopConnectionUseCase;

    const processAppUninstallWebhook = (
      shopDomain: ShopDomain,
      webhookId: string
    ) =>
      Effect.gen(function* () {
        yield* Effect.log("🚀 Starting deferred webhook processing", {
          shopDomain,
          webhookId,
        });

        // Find which organization owns this shop
        yield* Effect.log("🔍 Looking up organization for shop", {
          shopDomain,
        });
        const organizationSlug = yield* storeManagement.findOrganizationByShop(
          shopDomain
        );
        yield* Effect.log("✅ Found organization for shop", {
          shopDomain,
          organizationSlug,
        });

        // Disconnect the shop using organization handlers API
        yield* Effect.log("🔌 Starting shop disconnection", {
          shopDomain,
          organizationSlug,
        });
        const disconnectResult = yield* storeManagement.disconnectStore(
          organizationSlug,
          shopDomain
        );
        const disconnected = disconnectResult.success;

        yield* Effect.log("✅ Shop successfully disconnected", {
          shopDomain,
          organizationSlug,
        });

        // Clean up global shop connection table
        yield* Effect.log("🗑️ Starting global shop connection cleanup", {
          shopDomain,
        });

        const globalCleanupResult = yield* globalShopService
          .disconnectShop(shopDomain)
          .pipe(
            Effect.catchAll((error) => {
              return Effect.gen(function* () {
                yield* Effect.log("⚠️ Global shop connection cleanup failed", {
                  shopDomain,
                  error: error instanceof Error ? error.message : String(error),
                });
                return false;
              });
            })
          );

        if (globalCleanupResult) {
          yield* Effect.log("✅ Global shop connection removed", {
            shopDomain,
          });
        } else {
          yield* Effect.log("ℹ️ No global shop connection found to remove", {
            shopDomain,
          });
        }

        yield* Effect.log("✅ Webhook processing completed successfully", {
          shopDomain,
          webhookId,
          organizationSlug,
          globalCleanup: globalCleanupResult,
        });

        return {
          organizationSlug,
          disconnected,
          globalCleanup: globalCleanupResult,
        };
      }).pipe(
        Effect.withSpan("WebhookProcessingUseCase.processAppUninstallWebhook"),
        Effect.mapError((error) =>
          error instanceof Error
            ? error
            : new Error(
                `Webhook processing failed: ${error._tag || String(error)}`
              )
        )
      );

    return {
      processAppUninstallWebhook,
    };
  })
);
