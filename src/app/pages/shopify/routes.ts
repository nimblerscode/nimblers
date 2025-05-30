import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { route } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import type { AppContext } from "@/app/types/context";
import { organizationMiddleware } from "@/app/middleware/organizationMiddleware";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyOAuthUseCase } from "@/domain/shopify/oauth/service";
import { StoreConnectionService } from "@/domain/shopify/store/service";
import { ShopifyOAuthDOServiceLive } from "@/config/shopify";
import {
  StoreConnectionServiceLive,
  ShopifyStoreEnv,
} from "@/application/shopify/store/service";
import { ShopifyDashboard } from "./ShopifyDashboard";

// Helper to create complete store service layer
const createStoreServiceLayer = () =>
  Layer.provide(
    StoreConnectionServiceLive,
    Layer.succeed(ShopifyStoreEnv, { ORG_DO: env.ORG_DO as any })
  );

// Helper to create OAuth service layer
const createOAuthServiceLayer = () =>
  ShopifyOAuthDOServiceLive({
    SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
    SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
    SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
  });

export const routes = [
  // Dashboard page
  route("/", [ShopifyDashboard]),

  // Connection status API endpoint
  route("/status", [
    organizationMiddleware,
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request, ctx } = requestInfo;
      const appCtx = ctx as AppContext;
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop") as ShopDomain;

      if (!shop) {
        return Response.json({
          connected: false,
          error: "Shop parameter required",
        });
      }

      const program = Effect.gen(function* () {
        const storeService = yield* StoreConnectionService;
        return yield* storeService.checkConnectionStatus(
          appCtx.organizationId!,
          shop
        );
      });

      try {
        const result = await Effect.runPromise(
          program.pipe(
            Effect.provide(createStoreServiceLayer()),
            Effect.catchAll((error) =>
              Effect.succeed({
                connected: false,
                error: "Failed to check status",
                details: String(error),
              })
            )
          )
        );

        return Response.json(result);
      } catch (error) {
        return Response.json(
          {
            connected: false,
            error: "Failed to check status",
            details: String(error),
          },
          { status: 500 }
        );
      }
    },
  ]),

  // Disconnect endpoint
  route("/disconnect", [
    organizationMiddleware,
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request, ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }

      const url = new URL(request.url);
      const shop = url.searchParams.get("shop") as ShopDomain;

      if (!shop) {
        return Response.json(
          { error: "Shop parameter required" },
          { status: 400 }
        );
      }

      const program = Effect.gen(function* () {
        const storeService = yield* StoreConnectionService;
        return yield* storeService.disconnectStore(
          appCtx.organizationId!,
          shop
        );
      });

      try {
        const result = await Effect.runPromise(
          program.pipe(
            Effect.provide(createStoreServiceLayer()),
            Effect.catchAll((error) =>
              Effect.succeed({
                success: false,
                error: "Failed to disconnect",
                details: String(error),
              })
            )
          )
        );

        return Response.json(result);
      } catch (error) {
        return Response.json(
          { error: "Failed to disconnect", details: String(error) },
          { status: 500 }
        );
      }
    },
  ]),

  // Shopify app uninstall webhook (NO middleware - webhooks don't have sessions)
  route(
    "/webhooks/app/uninstalled",
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request } = requestInfo;

      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }

      // For now, return a simple acknowledgment
      // TODO: Implement proper webhook processing with deferred execution
      try {
        const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
        const webhookId = request.headers.get("X-Shopify-Webhook-Id");

        if (!shopDomain || !webhookId) {
          return Response.json(
            { error: "Missing required webhook headers" },
            { status: 400 }
          );
        }

        // Quick acknowledgment - actual processing would be deferred
        return Response.json({
          success: true,
          message: "Webhook received and queued for processing",
          shopDomain,
          webhookId,
        });
      } catch (error) {
        return Response.json(
          { error: "Webhook processing failed", details: String(error) },
          { status: 500 }
        );
      }
    }
  ),

  // OAuth install endpoint
  route("/oauth/install", [
    organizationMiddleware,
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request, ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.handleInstallRequest(
          appCtx.organizationId!,
          request
        );
      });

      try {
        return await Effect.runPromise(
          program.pipe(
            Effect.provide(createOAuthServiceLayer()),
            Effect.catchAll((error) => {
              return Effect.succeed(
                Response.json(
                  {
                    error: "Failed to process install request",
                    details: String(error),
                  },
                  { status: 500 }
                )
              );
            })
          )
        );
      } catch (error) {
        return Response.json(
          {
            error: "Failed to process install request",
            details: String(error),
          },
          { status: 500 }
        );
      }
    },
  ]),

  // OAuth callback endpoint
  route(
    "/oauth/callback",
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request } = requestInfo;
      const url = new URL(request.url);

      // Extract shop and state from URL
      const shop = url.searchParams.get("shop");
      const state = url.searchParams.get("state");

      // Extract organization slug from state parameter
      let organizationSlug = null;
      if (state) {
        // State format: "organizationSlug_org_uuid"
        if (state.includes("_org_")) {
          const parts = state.split("_org_");
          organizationSlug = parts[0]; // Get the part before "_org_" (the organization slug)
        }
      }

      if (shop && organizationSlug) {
        const program = Effect.gen(function* () {
          const oauthUseCase = yield* ShopifyOAuthUseCase;
          return yield* oauthUseCase.handleCallback(organizationSlug, request);
        });

        try {
          return await Effect.runPromise(
            program.pipe(
              Effect.provide(createOAuthServiceLayer()),
              Effect.catchAll((error) => {
                // Redirect to organization with error
                const dashboardUrl = new URL(
                  `/organization/${organizationSlug}`,
                  url.origin
                );
                dashboardUrl.searchParams.set(
                  "error",
                  "OAuth authorization failed"
                );

                return Effect.succeed(
                  new Response(null, {
                    status: 302,
                    headers: {
                      Location: dashboardUrl.toString(),
                      "Cache-Control": "no-cache",
                    },
                  })
                );
              })
            )
          );
        } catch (error) {
          // Handle unexpected errors
          const dashboardUrl = new URL(
            `/organization/${organizationSlug}`,
            url.origin
          );
          dashboardUrl.searchParams.set(
            "error",
            "Unexpected error during OAuth callback"
          );

          return new Response(null, {
            status: 302,
            headers: {
              Location: dashboardUrl.toString(),
              "Cache-Control": "no-cache",
            },
          });
        }
      }

      // Fallback: If we don't have shop and organization context, use default
      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.handleCallback("default-org", request);
      });

      try {
        return await Effect.runPromise(
          program.pipe(
            Effect.provide(createOAuthServiceLayer()),
            Effect.catchAll((error) => {
              return Effect.succeed(
                Response.json(
                  {
                    error: "Failed to process callback",
                    details: String(error),
                  },
                  { status: 500 }
                )
              );
            })
          )
        );
      } catch (error) {
        return Response.json(
          { error: "Failed to process callback", details: String(error) },
          { status: 500 }
        );
      }
    }
  ),
];
