import { Context, Effect, Layer } from "effect";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import type { OrganizationSlug } from "@/domain/global/organization/models";

export interface ShopConnectionCheckResult {
  canConnect: boolean;
  isConnected: boolean;
  connectedToOrganization?: string;
  message?: string;
}

// === Shop Connection Check Service ===
export abstract class ShopConnectionCheckService extends Context.Tag(
  "@application/shopify/ShopConnectionCheckService"
)<
  ShopConnectionCheckService,
  {
    readonly checkShopConnection: (
      shopDomain: ShopDomain,
      organizationId: OrganizationSlug
    ) => Effect.Effect<ShopConnectionCheckResult, never>;
  }
>() {}

// === Service Implementation ===
export const ShopConnectionCheckServiceLive = Layer.effect(
  ShopConnectionCheckService,
  Effect.gen(function* () {
    const globalShopService = yield* GlobalShopConnectionUseCase;

    return {
      checkShopConnection: (
        shopDomain: ShopDomain,
        organizationId: OrganizationSlug
      ) =>
        Effect.gen(function* () {
          // Check if shop is already connected to any organization
          const existingConnection =
            yield* globalShopService.checkShopConnection(shopDomain);

          if (!existingConnection) {
            // Shop is not connected to any organization - can connect
            return {
              canConnect: true,
              isConnected: false,
              message: `Shop ${shopDomain} is available for connection`,
            };
          }

          if (existingConnection.organizationId === organizationId) {
            // Shop is already connected to THIS organization
            return {
              canConnect: false,
              isConnected: true,
              connectedToOrganization: organizationId,
              message: `Shop ${shopDomain} is already connected to this organization`,
            };
          }

          // Shop is connected to a DIFFERENT organization
          return {
            canConnect: false,
            isConnected: true,
            connectedToOrganization: existingConnection.organizationId,
            message: `Shop ${shopDomain} is already connected to organization '${existingConnection.organizationId}'. Each Shopify store can only be connected to one organization at a time.`,
          };
        }).pipe(
          Effect.catchAll(() =>
            Effect.succeed({
              canConnect: true,
              isConnected: false,
              message:
                "Unable to verify shop connection status, proceeding with connection attempt",
            })
          ),
          Effect.withSpan("ShopConnectionCheckService.checkShopConnection")
        ),
    };
  })
);
