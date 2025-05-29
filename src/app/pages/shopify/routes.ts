import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { route } from "rwsdk/router";
import { ShopifyOAuthLayerLive } from "@/config/layers";
import type { ShopDomain } from "@/domain/global/shopify/oauth/models";
import { ShopifyOAuthUseCase } from "@/domain/global/shopify/oauth/service";
import { ShopifyDashboard } from "./ShopifyDashboard";

export const routes = [
  // Dashboard page
  route("/", [ShopifyDashboard]),

  // Connection status API endpoint
  route("/status", async ({ request }) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") as ShopDomain;

    if (!shop) {
      return Response.json({
        connected: false,
        error: "Shop parameter required",
      });
    }

    const program = Effect.gen(function* () {
      const oauthUseCase = yield* ShopifyOAuthUseCase;
      return yield* oauthUseCase.checkConnectionStatus(shop);
    });

    try {
      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            ShopifyOAuthLayerLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            }),
          ),
          Effect.catchAll((error) =>
            Effect.succeed({
              connected: false,
              error: "Failed to check status",
              details: String(error),
            }),
          ),
        ),
      );

      return Response.json(result);
    } catch (error) {
      return Response.json(
        {
          connected: false,
          error: "Failed to check status",
          details: String(error),
        },
        { status: 500 },
      );
    }
  }),

  // Disconnect endpoint
  route("/disconnect", async ({ request }) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return Response.json(
        { error: "Shop parameter required" },
        { status: 400 },
      );
    }

    const program = Effect.gen(function* () {
      const oauthUseCase = yield* ShopifyOAuthUseCase;
      return yield* oauthUseCase.disconnect(shop as any);
    });

    try {
      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            ShopifyOAuthLayerLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            }),
          ),
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              error: "Failed to disconnect",
              details: String(error),
            }),
          ),
        ),
      );

      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: "Failed to disconnect", details: String(error) },
        { status: 500 },
      );
    }
  }),

  // Shopify app uninstall webhook - SIMPLIFIED approach
  route("/webhooks/app/uninstalled", async ({ request }) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
      // Get the shop domain from webhook headers
      const shopDomain = request.headers.get("x-shopify-shop-domain");

      if (!shopDomain) {
        return Response.json(
          { error: "Missing shop domain in webhook headers" },
          { status: 400 },
        );
      }

      // Simplified approach: Use the OAuth disconnect functionality to remove the token
      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.disconnect(shopDomain as ShopDomain);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(
            ShopifyOAuthLayerLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            }),
          ),
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              error: "Failed to process app uninstall webhook",
              details: String(error),
            }),
          ),
        ),
      );

      return Response.json({
        success: true,
        message: `App successfully uninstalled for shop: ${shopDomain}`,
        shopDomain,
      });
    } catch (error) {
      return Response.json(
        { error: "Failed to process webhook", details: String(error) },
        { status: 500 },
      );
    }
  }),

  // OAuth install endpoint
  route("/oauth/install", async ({ request }) => {
    const program = Effect.gen(function* () {
      const oauthUseCase = yield* ShopifyOAuthUseCase;
      return yield* oauthUseCase.handleInstallRequest(request);
    });

    try {
      return await Effect.runPromise(
        program.pipe(
          Effect.provide(
            ShopifyOAuthLayerLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            }),
          ),
          Effect.catchAll((error) => {
            return Effect.succeed(
              Response.json(
                {
                  error: "Failed to process install request",
                  details: String(error),
                },
                { status: 500 },
              ),
            );
          }),
        ),
      );
    } catch (error) {
      return Response.json(
        { error: "Failed to process install request", details: String(error) },
        { status: 500 },
      );
    }
  }),

  // OAuth callback endpoint
  route("/oauth/callback", async ({ request }) => {
    const url = new URL(request.url);

    const program = Effect.gen(function* () {
      const oauthUseCase = yield* ShopifyOAuthUseCase;
      const result = yield* oauthUseCase.handleCallback(request);

      // After successful callback, save the shop connection to organization
      const shop = url.searchParams.get("shop");
      const state = url.searchParams.get("state");

      // Extract organization slug from state parameter
      let organizationSlug = null;
      if (state) {
        // State format: "organizationSlug_timestamp"
        const stateParts = state.split("_");
        if (stateParts.length >= 2) {
          organizationSlug = stateParts[0];
        }
      }

      if (shop && organizationSlug) {
        // TODO: Save the connected store to the organization database
        // This needs to be implemented with proper organization ID lookup
        // and ConnectedStoreRepo integration

        // For now, we'll rely on the OAuth token storage and URL parameters
        // The next step is to implement the full organization store connection

        // Redirect back to the organization dashboard
        const dashboardUrl = new URL(
          `/organization/${organizationSlug}`,
          url.origin,
        );
        dashboardUrl.searchParams.set("shopify_connected", "true");
        dashboardUrl.searchParams.set("shop", shop);

        return new Response(null, {
          status: 302,
          headers: {
            Location: dashboardUrl.toString(),
            "Cache-Control": "no-cache",
          },
        });
      }

      return result;
    });

    try {
      return await Effect.runPromise(
        program.pipe(
          Effect.provide(
            ShopifyOAuthLayerLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            }),
          ),
          Effect.catchAll((error) => {
            return Effect.succeed(
              Response.json(
                {
                  error: "Failed to process callback",
                  details: String(error),
                },
                { status: 500 },
              ),
            );
          }),
        ),
      );
    } catch (error) {
      return Response.json(
        { error: "Failed to process callback", details: String(error) },
        { status: 500 },
      );
    }
  }),
];
