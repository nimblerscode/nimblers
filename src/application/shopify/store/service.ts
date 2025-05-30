import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import {
  StoreManagementService,
  StoreConnectionService,
} from "@/domain/shopify/store/service";
import type { StoreNotFoundError } from "@/domain/shopify/store/models";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { DrizzleD1Client } from "@/infrastructure/persistence/global/d1/drizzle";
import { organization } from "@/infrastructure/persistence/global/d1/schema";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";

// Environment dependencies
export abstract class ShopifyStoreEnv extends Context.Tag(
  "@infrastructure/shopify/store/Env"
)<
  ShopifyStoreEnv,
  {
    ORG_DO: DurableObjectNamespace;
  }
>() {}

export const StoreManagementServiceLive = Layer.effect(
  StoreManagementService,
  Effect.gen(function* () {
    const env = yield* ShopifyStoreEnv;

    const getAllOrganizationSlugs = () =>
      Effect.gen(function* () {
        yield* Effect.log("📊 Querying organizations from global D1 database");
        const db = yield* DrizzleD1Client;
        const organizations = yield* Effect.tryPromise({
          try: () => db.select({ slug: organization.slug }).from(organization),
          catch: (error) =>
            new Error(`Failed to query organizations: ${error}`),
        });

        yield* Effect.log("📊 Organization query result", {
          count: organizations.length,
          organizations: organizations.map((org) => org.slug),
        });

        if (organizations.length === 0) {
          yield* Effect.log("❌ No organizations found in database");
          return yield* Effect.fail(
            new Error("No organizations found in database")
          );
        }

        return organizations.map((org) => org.slug);
      });

    const findOrganizationByShop = (shopDomain: ShopDomain) =>
      Effect.gen(function* () {
        // Get list of organization slugs from global database
        const organizationSlugs = yield* getAllOrganizationSlugs();
        yield* Effect.log("🔍 Starting organization lookup", {
          shopDomain,
          organizationsToCheck: organizationSlugs,
        });

        for (const orgSlug of organizationSlugs) {
          yield* Effect.log("🔍 Checking organization", {
            orgSlug,
            shopDomain,
          });

          const doId = env.ORG_DO.idFromName(orgSlug);
          const stub = env.ORG_DO.get(doId);

          const result = yield* Effect.gen(function* () {
            const client = yield* createOrganizationDOClient(stub);
            const stores = yield* client.organizations.getConnectedStores();

            yield* Effect.log("🔍 Retrieved stores for organization", {
              orgSlug,
              storeCount: stores.length,
              stores: stores.map((store) => ({
                shopDomain: store.shopDomain,
                status: store.status,
              })),
            });

            // Check if any store matches our shop domain
            const hasShop = stores.some(
              (store) =>
                store.shopDomain === shopDomain && store.status === "active"
            );

            if (hasShop) {
              yield* Effect.log("✅ Found matching shop in organization", {
                orgSlug,
                shopDomain,
              });
            }

            return hasShop ? orgSlug : null;
          }).pipe(
            Effect.provide(FetchHttpClient.layer),
            // Continue to next organization if this one fails
            Effect.catchAll((error) => {
              return Effect.gen(function* () {
                yield* Effect.log("⚠️ Failed to check organization", {
                  orgSlug,
                  error: error instanceof Error ? error.message : String(error),
                });
                return null;
              });
            })
          );

          if (result) {
            yield* Effect.log("✅ Organization found for shop", {
              shopDomain,
              organizationSlug: result,
            });
            return result; // Found the organization that owns this shop!
          }
        }

        yield* Effect.log("❌ No organization found for shop", {
          shopDomain,
          checkedOrganizations: organizationSlugs,
        });
        return yield* Effect.fail({
          _tag: "StoreNotFoundError",
          shopDomain,
        } as StoreNotFoundError);
      });

    const disconnectStoreFromOrganization = (
      organizationSlug: string,
      shopDomain: ShopDomain
    ) =>
      Effect.gen(function* () {
        yield* Effect.log("🔌 Attempting to disconnect shop", {
          organizationSlug,
          shopDomain,
        });

        // Use the typed organization client instead of raw fetch
        const doId = env.ORG_DO.idFromName(organizationSlug);
        const stub = env.ORG_DO.get(doId);

        const client = yield* createOrganizationDOClient(stub);
        const result = yield* client.organizations.disconnectStore({
          path: { shopDomain },
        });

        yield* Effect.log("🔌 Disconnection API response", {
          organizationSlug,
          shopDomain,
          success: result.success,
        });

        if (!result.success) {
          return yield* Effect.fail({
            _tag: "StoreNotFoundError",
            shopDomain,
          } as StoreNotFoundError);
        }

        return result.success;
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.mapError((error) =>
          error._tag === "StoreNotFoundError"
            ? error
            : new Error(
                `Failed to disconnect store: ${error._tag || String(error)}`
              )
        )
      );

    return {
      getAllOrganizationSlugs,
      findOrganizationByShop,
      disconnectStoreFromOrganization,
    };
  })
);

export const StoreConnectionServiceLive = Layer.effect(
  StoreConnectionService,
  Effect.gen(function* () {
    const env = yield* ShopifyStoreEnv;

    const checkConnectionStatus = (
      organizationSlug: string,
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
          .getConnectedStores()
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

    const disconnectStore = (
      organizationSlug: string,
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
      checkConnectionStatus,
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
    const storeManagement = yield* StoreManagementService;
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
        const disconnected =
          yield* storeManagement.disconnectStoreFromOrganization(
            organizationSlug,
            shopDomain
          );

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
