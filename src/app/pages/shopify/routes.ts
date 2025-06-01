import { env } from "cloudflare:workers";
import { Effect, Layer, Option } from "effect";
import { route } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { organizationMiddleware } from "@/app/middleware/organizationMiddleware";
import { ShopifyOAuthApplicationService } from "@/application/shopify/routes/oauthApplicationService";
import { ShopifyStoreApplicationService } from "@/application/shopify/routes/storeApplicationService";
import {
  GlobalShopConnectionLayerLive,
  ShopifyOAuthApplicationLayerLive,
  ShopifyStoreApplicationLayerLive,
  ShopifyValidationLayerLive,
  StoreConnectionLayerLive,
} from "@/config/shopify";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyStoreService } from "@/domain/shopify/store/service";
import { ShopifyValidationService } from "@/domain/shopify/validation/service";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { ShopifyDashboard } from "./ShopifyDashboard";

// === Routes ===
export const routes = [
  // Main Shopify dashboard page
  route("/", [organizationMiddleware, ShopifyDashboard]),

  // OAuth install endpoint
  route("/oauth/install", async ({ request }: RequestInfo) => {
    const url = new URL(request.url);

    const program = Effect.gen(function* () {
      // Step 1: Validate organization parameter
      const validationService = yield* ShopifyValidationService;
      const organizationSlug =
        yield* validationService.validateOrganizationParameter(url);

      // Step 2: Handle install request
      const oauthService = yield* ShopifyOAuthApplicationService;
      return yield* oauthService.handleInstallRequest(
        organizationSlug,
        request,
      );
    });

    const d1Layer = D1BindingLive(env);
    const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);

    const layer = ShopifyOAuthApplicationLayerLive({
      SHOPIFY_OAUTH_DO:
        env.SHOPIFY_OAUTH_DO as unknown as DurableObjectNamespace,
      SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
      SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
      ORG_DO: env.ORG_DO,
      DB: env.DB,
    }).pipe(Layer.provide(drizzleLayer));

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(layer),
        Effect.provide(ShopifyValidationLayerLive),
      ),
    );
  }),

  // OAuth callback endpoint
  route("/oauth/callback", async ({ request }: RequestInfo) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") as ShopDomain;
    const state = url.searchParams.get("state") as string;

    const program = Effect.gen(function* () {
      // Step 1: Validate required OAuth parameters
      const validationService = yield* ShopifyValidationService;
      const { state: validState } =
        yield* validationService.validateRequiredOAuthParams(
          Option.some(shop),
          Option.some(state),
        );

      // Step 2: Extract organization from state
      const organizationSlug =
        yield* validationService.extractOrganizationFromState(validState);

      // Step 3: Handle OAuth callback
      const oauthService = yield* ShopifyOAuthApplicationService;
      return yield* oauthService.handleCallback(organizationSlug, request);
    });

    try {
      const d1Layer = D1BindingLive(env);
      const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
      const layer = ShopifyOAuthApplicationLayerLive({
        SHOPIFY_OAUTH_DO:
          env.SHOPIFY_OAUTH_DO as unknown as DurableObjectNamespace,
        SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
        SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
        ORG_DO: env.ORG_DO,
        DB: env.DB,
      }).pipe(Layer.provide(drizzleLayer));

      return await Effect.runPromise(
        program.pipe(
          Effect.provide(Layer.mergeAll(layer, ShopifyValidationLayerLive)),
          Effect.catchAll((error: unknown) => {
            // Extract organization for fallback redirect
            const fallbackOrgSlug = state?.split(
              "_org_",
            )[0] as OrganizationSlug;

            return Effect.succeed(
              new Response(null, {
                status: 302,
                headers: {
                  Location: fallbackOrgSlug
                    ? `/organization/${fallbackOrgSlug}?error=${encodeURIComponent(
                        "OAuth authorization failed",
                      )}`
                    : "/",
                  "Cache-Control": "no-cache",
                },
              }),
            );
          }),
        ),
      );
    } catch (_error) {
      const fallbackOrgSlug = state?.split("_org_")[0] as OrganizationSlug;
      return new Response(null, {
        status: 302,
        headers: {
          Location: fallbackOrgSlug
            ? `/organization/${fallbackOrgSlug}?error=${encodeURIComponent(
                "OAuth authorization failed",
              )}`
            : "/",
          "Cache-Control": "no-cache",
        },
      });
    }
  }),

  // Store disconnect endpoint
  route("/disconnect", async ({ request }: RequestInfo) => {
    const url = new URL(request.url);

    const program = Effect.gen(function* () {
      // Step 1: Validate required parameters
      const validationService = yield* ShopifyValidationService;
      const organizationSlug =
        yield* validationService.validateOrganizationParameter(url);
      const shopDomain = yield* validationService.validateShopParameter(url);

      // Step 2: Handle store disconnection
      const storeService = yield* ShopifyStoreApplicationService;
      return yield* storeService.disconnectStore(organizationSlug, shopDomain);
    });

    try {
      const d1Layer = D1BindingLive(env);
      const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);

      const storeApplicationLayer = ShopifyStoreApplicationLayerLive({
        ORG_DO: env.ORG_DO,
        DB: env.DB,
      }).pipe(Layer.provide(drizzleLayer));

      const storeConnectionLayer = StoreConnectionLayerLive({
        ORG_DO: env.ORG_DO,
        DB: env.DB,
      }).pipe(Layer.provide(drizzleLayer));

      const layer = Layer.mergeAll(
        storeApplicationLayer,
        ShopifyValidationLayerLive,
        drizzleLayer,
      );

      const run = program
        .pipe(
          Effect.provide(layer),
          Effect.catchAll((error: unknown) =>
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
        )
        .pipe(Effect.provide(storeConnectionLayer));

      return await Effect.runPromise(run);
    } catch (_error) {
      return Response.json(
        {
          success: false,
          error: "Failed to disconnect",
        },
        { status: 500 },
      );
    }
  }),

  // Webhook endpoint for app uninstallation
  route("/webhooks/app/uninstalled", async ({ request }: RequestInfo) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const program = Effect.gen(function* () {
      // Extract shop domain from headers (Shopify standard)
      const shopDomain = request.headers.get(
        "x-shopify-shop-domain",
      ) as ShopDomain;

      if (!shopDomain) {
        return Response.json(
          {
            success: false,
            message: "Missing shop domain header",
          },
          { status: 400 },
        );
      }

      // Get the services we need
      const storeService = yield* ShopifyStoreService;
      const globalShopService = yield* GlobalShopConnectionUseCase;

      // Step 1: Use efficient global lookup - O(1) database query
      // This scales to millions of organizations with consistent performance
      yield* Effect.log("🔍 Looking up organization via global shop index", {
        shopDomain,
      });

      const shopConnection = yield* globalShopService
        .checkShopConnection(shopDomain)
        .pipe(Effect.catchAll(() => Effect.succeed(null)));

      let organizationSlug: OrganizationSlug | null = null;
      let disconnectResult = { success: true };

      if (shopConnection?.organizationSlug) {
        organizationSlug = shopConnection.organizationSlug;

        yield* Effect.log("✅ Found organization from global index", {
          shopDomain,
          organizationSlug,
        });

        // Step 2: Disconnect from the organization
        disconnectResult = yield* storeService.disconnectStore(
          organizationSlug,
          shopDomain,
        );

        yield* Effect.log("🔌 Disconnect result", {
          organizationSlug,
          shopDomain,
          success: disconnectResult.success,
        });
      } else {
        yield* Effect.log("ℹ️ Shop not found in global index", {
          shopDomain,
          reason: shopConnection
            ? "Missing organizationSlug"
            : "No record found",
        });
      }

      // Step 3: ONLY NOW clean up global shop connection table in D1
      // (after we've used its data to clean up the OrganizationDO)
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
          }),
        );

      if (globalCleanupResult) {
        yield* Effect.log("✅ Global shop connection successfully removed", {
          shopDomain,
        });
      } else {
        yield* Effect.log("ℹ️ No global shop connection found to remove", {
          shopDomain,
        });
      }

      yield* Effect.log("✅ Webhook processing completed", {
        shopDomain,
        organizationSlug: organizationSlug || "unknown",
        disconnected: disconnectResult.success,
        globalCleanup: globalCleanupResult,
      });

      return Response.json({
        success: true,
        message: `App successfully uninstalled for shop: ${shopDomain}`,
        shopDomain,
        organizationSlug: organizationSlug || "unknown",
        disconnected: disconnectResult.success,
        globalCleanup: globalCleanupResult,
      });
    });

    try {
      const d1Layer = D1BindingLive(env);
      const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
      const layer = Layer.mergeAll(
        StoreConnectionLayerLive({
          ORG_DO: env.ORG_DO,
          DB: env.DB,
        }),
        GlobalShopConnectionLayerLive({
          DB: env.DB,
        }),
      ).pipe(Layer.provide(drizzleLayer));

      return await Effect.runPromise(
        program.pipe(
          Effect.provide(Layer.mergeAll(layer, drizzleLayer)),
          Effect.catchAll((error: unknown) =>
            Effect.succeed(
              Response.json(
                {
                  success: false,
                  message: "Failed to process uninstall",
                  error: String(error),
                },
                { status: 500 },
              ),
            ),
          ),
        ),
      );
    } catch (_error) {
      return Response.json(
        {
          success: false,
          message: "Failed to process uninstall",
        },
        { status: 500 },
      );
    }
  }),
];
