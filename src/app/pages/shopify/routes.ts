import { env } from "cloudflare:workers";
import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { route } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { ShopifyOAuthDOServiceLive } from "@/config/shopify";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyOAuthUseCase } from "@/domain/shopify/oauth/service";
import { ShopifyWebhookVerifier } from "@/domain/shopify/webhooks/service";
import { createShopifyOAuthDOClient } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/api/client";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import {
  DrizzleD1Client,
  DrizzleD1ClientLive,
  D1BindingLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { organization } from "@/infrastructure/persistence/global/d1/schema";
import { ShopifyWebhookVerifierLive } from "@/infrastructure/shopify/webhooks/verifier";
import { ShopifyDashboard } from "./ShopifyDashboard";
import type { AppContext } from "@/app/types/context";
import { organizationMiddleware } from "@/app/middleware/organizationMiddleware";
import type { ShopifyWebhookHeaders } from "@/domain/shopify/webhooks/models";
// Global shop connection service imports
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";

// Helper function to get all organization slugs from global D1 database
function getAllOrganizationSlugs() {
  return Effect.gen(function* () {
    yield* Effect.log("📊 Querying organizations from global D1 database");
    const db = yield* DrizzleD1Client;
    const organizations = yield* Effect.tryPromise({
      try: () => db.select({ slug: organization.slug }).from(organization),
      catch: (error) => new Error(`Failed to query organizations: ${error}`),
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
  }).pipe(
    Effect.provide(
      Layer.provide(DrizzleD1ClientLive, D1BindingLive({ DB: env.DB }))
    )
  );
}

// Helper function to find which organization owns a shop using organization handlers
function findOrganizationByShopDomain(shopDomain: ShopDomain) {
  return Effect.gen(function* () {
    // Get list of organization slugs from global database
    const organizationSlugs = yield* getAllOrganizationSlugs();
    yield* Effect.log("🔍 Starting organization lookup", {
      shopDomain,
      organizationsToCheck: organizationSlugs,
    });

    for (const orgSlug of organizationSlugs) {
      yield* Effect.log("🔍 Checking organization", { orgSlug, shopDomain });

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
    return yield* Effect.fail(
      new Error(`No organization found that owns shop: ${shopDomain}`)
    );
  });
}

// Helper function to disconnect shop using organization handlers API
function disconnectShopFromOrganization(
  organizationSlug: string,
  shopDomain: ShopDomain
) {
  return Effect.gen(function* () {
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

    return result.success;
  }).pipe(Effect.provide(FetchHttpClient.layer));
}

// Helper function to verify Shopify webhook HMAC signature
function verifyShopifyWebhookHmac(request: Request) {
  return Effect.gen(function* () {
    yield* Effect.log("🔐 Starting webhook HMAC verification");

    // Check if webhook secret is configured
    if (!env.SHOPIFY_WEBHOOK_SECRET) {
      yield* Effect.log("❌ SHOPIFY_WEBHOOK_SECRET not configured");
      return yield* Effect.fail(
        new Error("SHOPIFY_WEBHOOK_SECRET not configured")
      );
    }

    // Log webhook secret info (securely - only first/last chars and length)
    const secretMasked =
      env.SHOPIFY_WEBHOOK_SECRET.length > 10
        ? `${env.SHOPIFY_WEBHOOK_SECRET.substring(
            0,
            4
          )}...${env.SHOPIFY_WEBHOOK_SECRET.substring(
            env.SHOPIFY_WEBHOOK_SECRET.length - 4
          )}`
        : "***";

    yield* Effect.log("🔐 Webhook secret info", {
      secretLength: env.SHOPIFY_WEBHOOK_SECRET.length,
      secretMasked,
      secretFirst10: env.SHOPIFY_WEBHOOK_SECRET.substring(0, 10),
      secretLast10: env.SHOPIFY_WEBHOOK_SECRET.substring(
        env.SHOPIFY_WEBHOOK_SECRET.length - 10
      ),
    });

    yield* Effect.log("🔐 Webhook secret found, proceeding with verification");

    const webhookVerifier = yield* ShopifyWebhookVerifier;

    // Extract headers using the exact case that Shopify sends
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
    const topicHeader = request.headers.get("X-Shopify-Topic");
    const shopDomainHeader = request.headers.get("X-Shopify-Shop-Domain");
    const webhookIdHeader = request.headers.get("X-Shopify-Webhook-Id");

    if (!hmacHeader || !topicHeader || !shopDomainHeader || !webhookIdHeader) {
      yield* Effect.log("❌ Missing required webhook headers", {
        hasHmacHeader: !!hmacHeader,
        hasTopicHeader: !!topicHeader,
        hasShopDomainHeader: !!shopDomainHeader,
        hasWebhookIdHeader: !!webhookIdHeader,
      });
      return yield* Effect.fail(
        new Error("Missing required Shopify webhook headers")
      );
    }

    // Create properly typed headers object
    const rawHeaders = {
      "X-Shopify-Hmac-Sha256": hmacHeader,
      "X-Shopify-Topic": topicHeader,
      "X-Shopify-Shop-Domain": shopDomainHeader,
      "X-Shopify-Webhook-Id": webhookIdHeader,
    } as ShopifyWebhookHeaders;

    yield* Effect.log("🔐 Extracted headers for verification", {
      hasHmacHeader: !!rawHeaders["X-Shopify-Hmac-Sha256"],
      hasTopicHeader: !!rawHeaders["X-Shopify-Topic"],
      hasShopDomainHeader: !!rawHeaders["X-Shopify-Shop-Domain"],
    });

    const body = yield* Effect.tryPromise({
      try: () => request.clone().text(),
      catch: () => new Error("Failed to read request body"),
    });

    yield* Effect.log("🔐 Request body read successfully", {
      bodyLength: body.length,
    });

    // Verify webhook using the secret from environment
    const isValid = yield* webhookVerifier.verifyWebhook(
      body,
      rawHeaders,
      env.SHOPIFY_WEBHOOK_SECRET
    );

    yield* Effect.log("🔐 HMAC verification result", { isValid });

    if (!isValid) {
      yield* Effect.log("❌ HMAC verification failed - invalid signature");
      return yield* Effect.fail(new Error("Invalid webhook HMAC signature"));
    }

    yield* Effect.log("✅ HMAC verification successful");
    return true;
  }).pipe(Effect.provide(ShopifyWebhookVerifierLive));
}

export const routes = [
  // Dashboard page
  route("/", [ShopifyDashboard]),

  // Test webhook secret verification endpoint
  route("/test-webhook-secret", async (requestInfo: RequestInfo) => {
    const { request } = requestInfo;

    if (request.method === "GET") {
      return Response.json({
        message: "Webhook Secret Test Endpoint",
        instructions: {
          "1": "POST to this endpoint with a test payload and secret",
          "2": "Include 'test-secret' header with your webhook secret",
          "3": "Include 'test-payload' header with test payload",
          "4": "Will show you the calculated HMAC",
        },
        currentSecretLength: env.SHOPIFY_WEBHOOK_SECRET
          ? env.SHOPIFY_WEBHOOK_SECRET.length
          : 0,
        secretConfigured: !!env.SHOPIFY_WEBHOOK_SECRET,
      });
    }

    if (request.method === "POST") {
      try {
        const testSecret = request.headers.get("test-secret");
        const testPayload =
          request.headers.get("test-payload") || "test payload";

        if (!testSecret) {
          return Response.json(
            { error: "Missing 'test-secret' header" },
            { status: 400 }
          );
        }

        // Calculate HMAC manually
        const encoder = new TextEncoder();
        const keyData = encoder.encode(testSecret);
        const messageData = encoder.encode(testPayload);

        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const signature = await crypto.subtle.sign(
          "HMAC",
          cryptoKey,
          messageData
        );
        const calculatedHmac = btoa(
          String.fromCharCode(...new Uint8Array(signature))
        );

        return Response.json({
          testPayload,
          secretLength: testSecret.length,
          calculatedHmac,
          instructions:
            "Use this calculated HMAC to verify your webhook secret is correct",
        });
      } catch (error) {
        return Response.json(
          { error: "Test failed", details: String(error) },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }),

  // Test webhook endpoint to verify webhook registration and processing
  route("/test-webhook", async (requestInfo: RequestInfo) => {
    const { request } = requestInfo;

    if (request.method === "GET") {
      // Show webhook configuration info
      const webhookTestUrl = `${
        new URL(request.url).origin
      }/shopify/webhooks/app/uninstalled`;

      return Response.json({
        message: "Webhook Test Endpoint",
        webhookUrl: webhookTestUrl,
        hasWebhookSecret: !!env.SHOPIFY_WEBHOOK_SECRET,
        instructions: {
          "1": "This endpoint shows webhook configuration",
          "2": "To test webhook: POST to this endpoint with Shopify webhook format",
          "3": `Webhook is registered at: ${webhookTestUrl}`,
          "4": "Check logs for webhook processing details",
        },
      });
    }

    if (request.method === "POST") {
      // Test webhook processing with fake data
      const testShopDomain = "test-shop.myshopify.com" as ShopDomain;

      try {
        const testProgram = Effect.gen(function* () {
          yield* Effect.log("🧪 Testing webhook processing flow");

          // Test organization lookup
          yield* Effect.log("🔍 Testing organization lookup");
          const organizations = yield* getAllOrganizationSlugs();
          yield* Effect.log("📊 Available organizations", { organizations });

          return {
            success: true,
            availableOrganizations: organizations,
            testShopDomain,
          };
        });

        const result = await Effect.runPromise(testProgram);

        return Response.json({
          message: "Webhook test completed",
          result,
          note: "This is a test endpoint - not a real webhook",
        });
      } catch (error) {
        return Response.json(
          {
            error: "Webhook test failed",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }),

  // Connection status API endpoint
  route("/status", [
    organizationMiddleware,
    async (requestInfo: RequestInfo) => {
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

      // Use organization ID from middleware context
      const organizationId = appCtx.organizationId;

      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.checkConnectionStatus(organizationId, shop);
      });

      try {
        const result = await Effect.runPromise(
          program.pipe(
            Effect.provide(
              ShopifyOAuthDOServiceLive({
                SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
                SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
                SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
              })
            ),
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
    async (requestInfo: RequestInfo) => {
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

      // Use organization ID from middleware context
      const organizationId = appCtx.organizationId;

      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.disconnect(organizationId, shop);
      });

      try {
        const result = await Effect.runPromise(
          program.pipe(
            Effect.provide(
              ShopifyOAuthDOServiceLive({
                SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
                SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
                SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
              })
            ),
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

      try {
        // Get essential data quickly for fast response
        const shopDomain = request.headers.get(
          "X-Shopify-Shop-Domain"
        ) as ShopDomain;
        const webhookId = request.headers.get("X-Shopify-Webhook-Id");

        if (!shopDomain) {
          return Response.json(
            { error: "Missing shop domain in webhook headers" },
            { status: 400 }
          );
        }

        if (!webhookId) {
          return Response.json(
            { error: "Missing webhook ID in headers" },
            { status: 400 }
          );
        }

        // Fast validation program - respond within 5 seconds as per Shopify requirements
        const fastValidationProgram = Effect.gen(function* () {
          yield* Effect.log("🎯 Shopify uninstall webhook received", {
            shopDomain,
            webhookId,
            method: request.method,
          });

          // 1. Quick HMAC verification
          yield* Effect.log("🔐 Starting HMAC verification for webhook");
          yield* verifyShopifyWebhookHmac(request);
          yield* Effect.log("✅ HMAC verification successful");

          // 2. Quick idempotency check - TODO: Implement webhook ID storage
          // This would check if webhookId was already processed

          return {
            shopDomain,
            webhookId,
            verified: true,
          };
        });

        // Execute fast validation and respond immediately
        const validationResult = await Effect.runPromise(
          fastValidationProgram.pipe(Effect.provide(ShopifyWebhookVerifierLive))
        );

        // **FAST RESPONSE - Acknowledge receipt within 5 seconds**
        const response = Response.json({
          success: true,
          message: "Webhook received and queued for processing",
          shopDomain,
          webhookId,
          status: "processing",
        });

        // **DEFERRED PROCESSING - Schedule heavy work after response**
        // Use a promise that doesn't block the response
        processWebhookAsync(shopDomain, webhookId).catch((error: Error) => {
          Effect.runPromise(
            Effect.log("Deferred webhook processing failed:", error)
          );
        });

        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log the error for debugging
        await Effect.runPromise(
          Effect.log("❌ Webhook validation failed", {
            shopDomain: request.headers.get("X-Shopify-Shop-Domain"),
            error: errorMessage,
          })
        );

        // Handle specific error cases with fast responses
        if (errorMessage.includes("SHOPIFY_WEBHOOK_SECRET not configured")) {
          return Response.json(
            { error: "Configuration error", details: errorMessage },
            { status: 500 }
          );
        }

        if (errorMessage.includes("Invalid webhook HMAC signature")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        return Response.json(
          { error: "Webhook processing failed", details: errorMessage },
          { status: 500 }
        );
      }
    }
  ),

  // OAuth install endpoint
  route("/oauth/install", [
    organizationMiddleware,
    async (requestInfo: RequestInfo) => {
      const { request, ctx } = requestInfo;
      const appCtx = ctx as AppContext;
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");

      // Use organization ID from middleware context
      const organizationId = appCtx.organizationId;

      const program = Effect.gen(function* () {
        const oauthUseCase = yield* ShopifyOAuthUseCase;
        return yield* oauthUseCase.handleInstallRequest(
          organizationId,
          request
        );
      });

      try {
        return await Effect.runPromise(
          program.pipe(
            Effect.provide(
              ShopifyOAuthDOServiceLive({
                SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
                SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
                SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
              })
            ),
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

  // OAuth callback endpoint (already uses state-based organization)
  route("/oauth/callback", async (requestInfo: RequestInfo) => {
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
      try {
        // Handle OAuth callback and save store connection
        const program = Effect.gen(function* () {
          // First, handle the OAuth callback to get the access token
          const oauthUseCase = yield* ShopifyOAuthUseCase;
          const oauthResponse = yield* oauthUseCase.handleCallback(
            organizationSlug,
            request
          );

          if (oauthResponse.status !== 302) {
            return {
              success: false,
              message: "OAuth callback failed",
            };
          }

          // Check connection status to verify the shop is connected
          const connectionStatus = yield* oauthUseCase.checkConnectionStatus(
            organizationSlug,
            shop as ShopDomain
          );

          if (!connectionStatus.connected) {
            return {
              success: false,
              message: "Failed to verify shop connection",
            };
          }

          // Get the access token using the type-safe client
          const shopifyOAuthDoId =
            env.SHOPIFY_OAUTH_DO.idFromName("shopify-oauth");
          const shopifyOAuthStub = env.SHOPIFY_OAUTH_DO.get(shopifyOAuthDoId);

          // Create the type-safe client and retrieve the access token
          const client = yield* createShopifyOAuthDOClient(shopifyOAuthStub);
          const accessTokenResponse = yield* client.shopifyOAuth
            .retrieveAccessToken({
              urlParams: { shop: shop as ShopDomain },
            })
            .pipe(
              Effect.mapError(
                (error) =>
                  new Error(
                    `Failed to retrieve access token: ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  )
              )
            );

          if (!accessTokenResponse.accessToken) {
            return {
              success: false,
              message: "Failed to retrieve access token",
            };
          }

          // Now connect the store to the organization using the new server action
          const connectResult = yield* Effect.tryPromise({
            try: async () => {
              const { connectShopifyStore } = await import(
                "@/app/actions/shopify/connectStore"
              );
              return await connectShopifyStore(
                organizationSlug,
                shop,
                accessTokenResponse.accessToken!,
                connectionStatus.scope || "read_products,write_products"
              );
            },
            catch: (error) =>
              new Error(
                `Failed to connect store: ${
                  error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!connectResult.success) {
            return {
              success: false,
              message: connectResult.message,
            };
          }

          return {
            success: true,
            message: "Store connected successfully",
          };
        });

        const result = await Effect.runPromise(
          program.pipe(
            Effect.provide(
              ShopifyOAuthDOServiceLive({
                SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
                SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
                SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
              })
            ),
            Effect.provide(FetchHttpClient.layer),
            Effect.catchAll((error) =>
              Effect.succeed({
                success: false,
                message: `Failed to connect store: ${error}`,
              })
            )
          )
        );

        if (result.success) {
          // Redirect to organization overview with success message
          const dashboardUrl = new URL(
            `/organization/${organizationSlug}`,
            url.origin
          );
          dashboardUrl.searchParams.set("connected", "true");
          dashboardUrl.searchParams.set("shop", shop);

          return new Response(null, {
            status: 302,
            headers: {
              Location: dashboardUrl.toString(),
              "Cache-Control": "no-cache",
            },
          });
        }

        // OAuth failed, redirect with error
        const dashboardUrl = new URL(
          `/organization/${organizationSlug}`,
          url.origin
        );
        dashboardUrl.searchParams.set(
          "error",
          result.message || "OAuth authorization failed"
        );

        return new Response(null, {
          status: 302,
          headers: {
            Location: dashboardUrl.toString(),
            "Cache-Control": "no-cache",
          },
        });
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
          Effect.provide(
            ShopifyOAuthDOServiceLive({
              SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
              SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
              SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
            })
          ),
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
  }),
];

// Deferred processing function - runs after fast response
async function processWebhookAsync(
  shopDomain: ShopDomain,
  webhookId: string
): Promise<void> {
  try {
    // Create a combined Effect program for the entire webhook processing
    const webhookProgram = Effect.gen(function* () {
      yield* Effect.log("🚀 Starting deferred webhook processing", {
        shopDomain,
        webhookId,
      });

      // Find which organization owns this shop
      yield* Effect.log("🔍 Looking up organization for shop", { shopDomain });
      const organizationSlug = yield* findOrganizationByShopDomain(shopDomain);
      yield* Effect.log("✅ Found organization for shop", {
        shopDomain,
        organizationSlug,
      });

      // Disconnect the shop using organization handlers API
      yield* Effect.log("🔌 Starting shop disconnection", {
        shopDomain,
        organizationSlug,
      });
      const disconnected = yield* disconnectShopFromOrganization(
        organizationSlug,
        shopDomain
      );

      if (!disconnected) {
        yield* Effect.log("❌ Shop disconnection failed", {
          shopDomain,
          organizationSlug,
        });
        return yield* Effect.fail(
          new Error("Failed to disconnect shop from organization")
        );
      }

      yield* Effect.log("✅ Shop successfully disconnected", {
        shopDomain,
        organizationSlug,
      });

      // Clean up global shop connection table
      yield* Effect.log("🗑️ Starting global shop connection cleanup", {
        shopDomain,
      });

      const globalShopService = yield* GlobalShopConnectionUseCase;
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
        yield* Effect.log("✅ Global shop connection removed", { shopDomain });
      } else {
        yield* Effect.log("ℹ️ No global shop connection found to remove", {
          shopDomain,
        });
      }

      // TODO: Mark webhook as processed in idempotency store
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
    });

    await Effect.runPromise(
      webhookProgram.pipe(
        Effect.provide(
          Layer.provide(
            GlobalShopConnectionUseCaseLive,
            Layer.provide(
              GlobalShopConnectionRepoLive,
              Layer.provide(DrizzleD1ClientLive, D1BindingLive({ DB: env.DB }))
            )
          )
        )
      )
    );
  } catch (error) {
    await Effect.runPromise(
      Effect.log("Deferred webhook processing failed:", {
        shopDomain,
        webhookId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    // TODO: Implement retry logic or dead letter queue
  }
}
