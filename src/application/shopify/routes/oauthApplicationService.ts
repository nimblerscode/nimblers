import { Context, Effect, Layer } from "effect";
import { ConnectStoreApplicationService } from "@/application/shopify/connection/connectStoreService";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyOAuthUseCase } from "@/domain/shopify/oauth/service";
import type { ShopifyValidationError } from "@/domain/shopify/validation/models";

// === OAuth Application Service ===
export abstract class ShopifyOAuthApplicationService extends Context.Tag(
  "@application/shopify/OAuthApplication",
)<
  ShopifyOAuthApplicationService,
  {
    readonly handleInstallRequest: (
      organizationSlug: OrganizationSlug,
      request: Request,
    ) => Effect.Effect<Response, ShopifyValidationError>;
    readonly handleCallback: (
      organizationSlug: OrganizationSlug,
      request: Request,
    ) => Effect.Effect<Response, ShopifyValidationError>;
  }
>() {}

export const ShopifyOAuthApplicationServiceLive = Layer.effect(
  ShopifyOAuthApplicationService,
  Effect.gen(function* () {
    const oauthUseCase = yield* ShopifyOAuthUseCase;
    const connectStoreService = yield* ConnectStoreApplicationService;

    return {
      handleInstallRequest: (
        organizationSlug: OrganizationSlug,
        request: Request,
      ) =>
        Effect.gen(function* () {
          return yield* oauthUseCase.handleInstallRequest(
            organizationSlug,
            request,
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(
              Response.json(
                { error: "Install request failed", details: String(error) },
                { status: 500 },
              ),
            ),
          ),
          Effect.withSpan("ShopifyOAuthApplication.handleInstallRequest"),
        ),

      handleCallback: (organizationSlug: OrganizationSlug, request: Request) =>
        Effect.gen(function* () {
          const url = new URL(request.url);
          const shop = url.searchParams.get("shop") as ShopDomain;

          // Step 1: Complete OAuth flow
          const oauthResult = yield* oauthUseCase.handleCallback(
            organizationSlug,
            request,
          );

          // Step 2: Connect store (wait for completion to ensure store is connected before redirect)
          const connectionResult = yield* connectStoreService
            .connectShopifyStore({ organizationSlug, shopDomain: shop })
            .pipe(
              Effect.tap((result) =>
                Effect.logInfo("Store connection result", {
                  organizationSlug,
                  shopDomain: shop,
                  success: result.success,
                  message: result.message,
                  storeId: result.storeId,
                }),
              ),
              Effect.catchAll((error) => {
                // Log error but don't fail the OAuth flow
                return Effect.gen(function* () {
                  yield* Effect.logError("Store connection failed", {
                    organizationSlug,
                    shopDomain: shop,
                    error: String(error),
                  });
                  // Return a failure result instead of failing the entire OAuth flow
                  return {
                    success: false,
                    message: `Store connection failed: ${String(error)}`,
                    error: "CONNECTION_FAILED",
                  };
                });
              }),
            );

          // Log final connection status
          yield* Effect.logInfo("Final store connection status", {
            organizationSlug,
            shopDomain: shop,
            connectionSuccess: connectionResult.success,
          });

          return oauthResult;
        }).pipe(
          Effect.catchAll((error) => {
            const url = new URL(request.url);
            const state = url.searchParams.get("state");
            const orgSlug = state?.split("_org_")[0] as OrganizationSlug;

            return Effect.succeed(
              new Response(null, {
                status: 302,
                headers: {
                  Location: orgSlug
                    ? `/organization/${orgSlug}?error=${encodeURIComponent(
                        "OAuth authorization failed",
                      )}`
                    : "/",
                  "Cache-Control": "no-cache",
                },
              }),
            );
          }),
          Effect.withSpan("ShopifyOAuthApplication.handleCallback"),
        ),
    };
  }),
);
