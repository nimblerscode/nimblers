import { Context, Effect, Layer } from "effect";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import { OrgD1Service } from "@/domain/global/organization/service";
import { ShopifyStoreService as DomainStoreConnectionService } from "@/domain/shopify/store/service";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { FetchHttpClient } from "@effect/platform";

export interface ConnectStoreResult {
  success: boolean;
  message: string;
  storeId?: string;
  shopDomain?: ShopDomain;
  error?: string;
}

// Environment dependencies for OrganizationDO access
export abstract class ConnectStoreEnv extends Context.Tag(
  "@application/shopify/ConnectStoreEnv"
)<
  ConnectStoreEnv,
  {
    ORG_DO: DurableObjectNamespace;
  }
>() {}

// === Connect Store Application Service ===
export abstract class ConnectStoreApplicationService extends Context.Tag(
  "@application/shopify/ConnectStoreApplicationService"
)<
  ConnectStoreApplicationService,
  {
    readonly connectShopifyStore: ({
      organizationSlug,
      shopDomain,
    }: {
      organizationSlug: OrganizationSlug;
      shopDomain: ShopDomain;
    }) => Effect.Effect<ConnectStoreResult, never>;
  }
>() {}

// === Service Implementation ===
export const ConnectStoreApplicationServiceLive = Layer.effect(
  ConnectStoreApplicationService,
  Effect.gen(function* () {
    const globalShopService = yield* GlobalShopConnectionUseCase;
    const storeConnectionService = yield* DomainStoreConnectionService;
    const orgService = yield* OrgD1Service;
    const env = yield* ConnectStoreEnv;

    return {
      connectShopifyStore: ({
        organizationSlug,
        shopDomain,
      }: {
        organizationSlug: OrganizationSlug;
        shopDomain: ShopDomain;
      }) =>
        Effect.gen(function* () {
          // STEP 0: Convert OrganizationSlug to OrganizationId
          const organization = yield* orgService
            .getOrgBySlug(organizationSlug)
            .pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new Error(`Organization not found: ${organizationSlug}`)
                )
              )
            );

          const organizationId = organization.id;

          // STEP 1: Global constraint check
          const existingConnection = yield* globalShopService
            .checkShopConnection(shopDomain)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));

          // Check if shop is connected to a different valid organization
          if (
            existingConnection?.organizationSlug && // Only block if organizationSlug is not null/undefined
            existingConnection.organizationSlug !== organizationSlug
          ) {
            return {
              success: false,
              message: `Shop '${shopDomain}' is already connected to another organization. Each Shopify store can only be connected to one organization at a time. Please disconnect from the current organization before connecting to '${organizationSlug}'.`,
              error: "SHOP_ALREADY_CONNECTED",
            };
          }

          // If there's a stale record with undefined/null organizationSlug, log it and continue
          if (existingConnection && !existingConnection.organizationSlug) {
            yield* Effect.logWarning(
              "Found stale shop connection record with undefined organizationSlug",
              {
                shopDomain,
                existingOrganizationSlug: existingConnection.organizationSlug,
                newOrganizationSlug: organizationSlug,
              }
            );
          }

          // STEP 2: Check connection status via Store Connection Service
          const connectionStatus = yield* storeConnectionService
            .checkConnectionStatus(organizationSlug, shopDomain)
            .pipe(
              Effect.catchAll((error) => {
                // Log error but continue with connection attempt
                return Effect.gen(function* () {
                  yield* Effect.log(
                    `Failed to check connection status: ${error}`
                  );
                  return { connected: false };
                });
              })
            );

          if (connectionStatus.connected) {
            return {
              success: true,
              message: `Shop '${shopDomain}' is already connected to ${organizationSlug}`,
              shopDomain,
            };
          }

          // STEP 3: Create/update global record (if not exists or is stale)
          if (!existingConnection || !existingConnection.organizationSlug) {
            const action = !existingConnection ? "Creating" : "Updating stale";
            yield* Effect.log(`${action} global shop connection record`, {
              shopDomain,
              organizationSlug,
              existingRecord: existingConnection ? "stale" : "none",
            });

            yield* globalShopService
              .connectShop({
                shopDomain,
                organizationSlug: organizationSlug,
                type: "shopify" as const,
                status: "active" as const,
                connectedAt: new Date(),
              })
              .pipe(
                Effect.catchAll((error) => {
                  // Log error but don't fail the entire operation
                  return Effect.logError(
                    `Failed to ${action.toLowerCase()} global shop connection record: ${error}`
                  );
                })
              );
          }

          // STEP 4: Create connected store record in OrganizationDO
          yield* Effect.log("🔗 Creating connected store in OrganizationDO", {
            organizationSlug,
            shopDomain,
            organizationId,
          });

          const storeResult = yield* Effect.gen(function* () {
            const doId = env.ORG_DO.idFromName(organizationSlug);
            const stub = env.ORG_DO.get(doId);
            const client = yield* createOrganizationDOClient(stub);

            // Call the connectStore endpoint to create the connected_store record
            const result = yield* client.organizations
              .connectStore({
                payload: {
                  organizationSlug,
                  type: "shopify" as const,
                  shopDomain,
                },
              })
              .pipe(
                Effect.mapError(
                  (error) =>
                    new Error(`Failed to connect store in DO: ${error}`)
                )
              );

            yield* Effect.log("🔗 Connected store in OrganizationDO", {
              organizationSlug,
              shopDomain,
              storeId: result.id,
              status: result.status,
            });

            return result;
          }).pipe(
            Effect.provide(FetchHttpClient.layer),
            Effect.catchAll((error) => {
              // Log error but don't fail the entire operation
              return Effect.gen(function* () {
                yield* Effect.logError(
                  `Failed to create connected store in OrganizationDO: ${error}`
                );
                // Return a minimal success response for backwards compatibility
                return {
                  id: `store-${organizationSlug}-${shopDomain.replace(
                    ".myshopify.com",
                    ""
                  )}`,
                  shopDomain,
                  status: "active" as const,
                };
              });
            })
          );

          return {
            success: true,
            message: `Successfully connected ${shopDomain} to ${organizationSlug}`,
            shopDomain,
            storeId: storeResult.id,
          };
        }).pipe(
          Effect.catchAll((error: unknown) =>
            Effect.succeed({
              success: false,
              message: `Failed to connect store: ${
                error instanceof Error ? error.message : String(error)
              }`,
              error: "UNEXPECTED_ERROR",
            })
          ),
          Effect.withSpan("ConnectStoreApplicationService.connectShopifyStore")
        ),
    };
  })
);
