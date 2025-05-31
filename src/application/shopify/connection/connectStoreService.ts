import { Context, Effect, Layer } from "effect";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import { OrgD1Service } from "@/domain/global/organization/service";
import { StoreConnectionService as DomainStoreConnectionService } from "@/domain/shopify/store/service";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";

export interface ConnectStoreResult {
  success: boolean;
  message: string;
  storeId?: string;
  shopDomain?: ShopDomain;
  error?: string;
}

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

          if (
            existingConnection &&
            existingConnection.organizationId !== organizationId
          ) {
            return {
              success: false,
              message: `Shop '${shopDomain}' is already connected to organization '${existingConnection.organizationId}'. Each Shopify store can only be connected to one organization at a time.`,
              error: "SHOP_ALREADY_CONNECTED",
            };
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

          // STEP 3: Create/update global record (if not already exists)
          if (!existingConnection) {
            yield* globalShopService
              .connectShop({
                shopDomain,
                organizationId: organizationId,
                type: "shopify" as const,
                status: "active" as const,
                connectedAt: new Date(),
              })
              .pipe(
                Effect.catchAll((error) => {
                  // Log error but don't fail the entire operation
                  return Effect.logError(
                    `Failed to create global shop connection record: ${error}`
                  );
                })
              );
          }

          return {
            success: true,
            message: `Successfully connected ${shopDomain} to ${organizationSlug}`,
            shopDomain,
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
