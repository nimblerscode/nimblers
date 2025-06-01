import { Context, Effect, Layer } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyStoreService } from "@/domain/shopify/store/service";
import type { ShopifyValidationError } from "@/domain/shopify/validation/models";

// === Store Application Service ===
export abstract class ShopifyStoreApplicationService extends Context.Tag(
  "@application/shopify/StoreApplication",
)<
  ShopifyStoreApplicationService,
  {
    readonly disconnectStore: (
      organizationSlug: OrganizationSlug,
      shopDomain: ShopDomain,
    ) => Effect.Effect<Response, ShopifyValidationError>;
  }
>() {}

export const ShopifyStoreApplicationServiceLive = Layer.effect(
  ShopifyStoreApplicationService,
  Effect.gen(function* () {
    const storeService = yield* ShopifyStoreService;

    return {
      disconnectStore: (
        organizationSlug: OrganizationSlug,
        shopDomain: ShopDomain,
      ) =>
        Effect.gen(function* () {
          const result = yield* storeService.disconnectStore(
            organizationSlug,
            shopDomain,
          );

          return Response.json({
            success: result.success,
          });
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(
              Response.json(
                {
                  success: false,
                  error: "Failed to disconnect",
                  details: String(error),
                },
                { status: 500 },
              ),
            ),
          ),
          Effect.withSpan("ShopifyStoreApplication.disconnectStore"),
        ),
    };
  }),
);
