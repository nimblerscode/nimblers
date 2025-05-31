import { env } from "cloudflare:workers";
import { Effect, Layer, Match, Data, Option } from "effect";
import { route } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import type { AppContext } from "@/app/types/context";
import { organizationMiddleware } from "@/app/middleware/organizationMiddleware";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { ShopifyOAuthUseCase } from "@/domain/shopify/oauth/service";
import { StoreConnectionService } from "@/domain/shopify/store/service";
import {
  ShopifyOAuthDOServiceLive,
  ConnectStoreApplicationLayerLive,
} from "@/config/shopify";
import {
  StoreConnectionServiceLive,
  ShopifyStoreEnv,
} from "@/application/shopify/store/service";
import { ConnectStoreApplicationService } from "@/application/shopify/connection/connectStoreService";
import { ShopifyDashboard } from "./ShopifyDashboard";
import { OrganizationSlug } from "@/domain/global/organization/models";

// Define custom errors using Effect-TS Data.TaggedError pattern
class MissingOrganizationError extends Data.TaggedError(
  "MissingOrganizationError"
)<{
  message?: string;
}> {
  constructor(options: { message?: string } = {}) {
    super({
      message:
        options.message ??
        "Organization ID is required but not found in context",
    });
  }
}

class MissingShopParameterError extends Data.TaggedError(
  "MissingShopParameterError"
)<{
  message?: string;
}> {
  constructor(options: { message?: string } = {}) {
    super({
      message: options.message ?? "Shop parameter is required",
    });
  }
}

class EffectExecutionError extends Data.TaggedError("EffectExecutionError")<{
  message?: string;
  cause?: unknown;
}> {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message ?? "Failed to execute Effect program",
      cause: options.cause,
    });
  }
}

// Type union for all our custom errors
type ShopifyRouteError =
  | MissingOrganizationError
  | MissingShopParameterError
  | EffectExecutionError;

// Pattern matcher for error handling using Effect-TS Match
const matchError = Match.type<ShopifyRouteError | Error>().pipe(
  Match.tag("MissingOrganizationError", () => ({
    connected: false,
    error: "Organization not found in context",
    statusCode: 401,
  })),
  Match.tag("MissingShopParameterError", () => ({
    connected: false,
    error: "Shop parameter required",
    statusCode: 400,
  })),
  Match.orElse((error) => ({
    connected: false,
    error: "Failed to check status",
    details: String(error),
    statusCode: 500,
  }))
);

// Pattern matcher for disconnect errors
const matchDisconnectError = Match.type<ShopifyRouteError | Error>().pipe(
  Match.tag("MissingOrganizationError", () => ({
    success: false,
    error: "Organization not found in context",
    statusCode: 401,
  })),
  Match.tag("MissingShopParameterError", () => ({
    success: false,
    error: "Shop parameter required",
    statusCode: 400,
  })),
  Match.orElse((error) => ({
    success: false,
    error: "Failed to disconnect",
    details: String(error),
    statusCode: 500,
  }))
);

// Pattern matcher for install errors
const matchInstallError = Match.type<ShopifyRouteError | Error>().pipe(
  Match.tag("MissingOrganizationError", () =>
    Response.json(
      { error: "Organization not found in context" },
      { status: 401 }
    )
  ),
  Match.orElse((error) =>
    Response.json(
      {
        error: "Failed to process install request",
        details: String(error),
      },
      { status: 500 }
    )
  )
);

// Helper to extract organization slug from URL (Shopify routes are org-scoped)
const extractOrganizationSlug = (
  request: Request
): Effect.Effect<OrganizationSlug, MissingOrganizationError> =>
  Effect.gen(function* () {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    // Look for /organization/{slug}/ pattern in the URL
    const orgIndex = pathSegments.indexOf("organization");
    if (orgIndex !== -1) {
      const slug = pathSegments[orgIndex + 1]; // This could be undefined
      if (slug) {
        return slug as OrganizationSlug;
      }
    }

    // Fallback: check if this is a callback with state parameter containing org info
    const state = url.searchParams.get("state");
    if (state && state.includes("_org_")) {
      const parts = state.split("_org_");
      const orgSlug = parts[0];
      if (orgSlug) {
        return orgSlug as OrganizationSlug;
      }
    }

    // If we reach here, no valid organization slug was found
    return yield* Effect.fail(
      new MissingOrganizationError({
        message: "Organization slug not found in URL path or state parameter",
      })
    );
  });

// Helper to validate organization ID from context
const validateOrganizationId = (ctx: AppContext) =>
  Effect.gen(function* () {
    if (!ctx.organizationId) {
      yield* Effect.fail(new MissingOrganizationError());
    }
    return ctx.organizationId;
  });

// Helper to validate shop parameter from URL
const validateShopParameter = (url: URL) =>
  Effect.gen(function* () {
    const shop = url.searchParams.get("shop") as ShopDomain;
    if (!shop) {
      yield* Effect.fail(new MissingShopParameterError());
    }
    return shop;
  });

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

// Helper to create complete store connection layer (for post-OAuth orchestration)
const createStoreConnectionLayer = () =>
  ConnectStoreApplicationLayerLive({
    ORG_DO: env.ORG_DO as any,
    DB: env.DB,
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

      const program = Effect.gen(function* () {
        const organizationId = yield* validateOrganizationId(appCtx);
        const shop = yield* validateShopParameter(url);
        const storeService = yield* StoreConnectionService;

        return yield* storeService.checkConnectionStatus(organizationId, shop);
      });

      const effectProgram = Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              program.pipe(
                Effect.provide(createStoreServiceLayer()),
                Effect.catchAll((error) => {
                  const errorResult = matchError(error);
                  return Effect.succeed(errorResult);
                })
              )
            ),
          catch: (error) =>
            new EffectExecutionError({
              message: "Failed to execute status check",
              cause: error,
            }),
        });

        // Handle result with pattern matching
        if ("statusCode" in result) {
          const { statusCode, ...responseData } = result;
          return Response.json(responseData, { status: statusCode });
        }
        return Response.json(result);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            Response.json(
              {
                connected: false,
                error: "Failed to check status",
                details: String(error),
              },
              { status: 500 }
            )
          )
        )
      );

      return Effect.runPromise(effectProgram);
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

      const program = Effect.gen(function* () {
        const organizationId = yield* validateOrganizationId(appCtx);
        const shop = yield* validateShopParameter(url);
        const storeService = yield* StoreConnectionService;

        return yield* storeService.disconnectStore(organizationId, shop);
      });

      const effectProgram = Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              program.pipe(
                Effect.provide(createStoreServiceLayer()),
                Effect.catchAll((error) => {
                  const errorResult = matchDisconnectError(error);
                  return Effect.succeed(errorResult);
                })
              )
            ),
          catch: (error) =>
            new EffectExecutionError({
              message: "Failed to execute disconnect",
              cause: error,
            }),
        });

        // Handle result with pattern matching
        if ("statusCode" in result) {
          const { statusCode, ...responseData } = result;
          return Response.json(responseData, { status: statusCode });
        }
        return Response.json(result);
      }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            Response.json(
              { error: "Failed to disconnect", details: String(error) },
              { status: 500 }
            )
          )
        )
      );

      return Effect.runPromise(effectProgram);
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
      const effectProgram = Effect.succeed(() => {
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
      }).pipe(
        Effect.map((fn) => fn()),
        Effect.catchAll((error) =>
          Effect.succeed(
            Response.json(
              { error: "Webhook processing failed", details: String(error) },
              { status: 500 }
            )
          )
        )
      );

      return Effect.runPromise(effectProgram);
    }
  ),

  // OAuth install endpoint
  route("/oauth/install", [
    organizationMiddleware,
    async (requestInfo: RequestInfo): Promise<Response> => {
      const { request, ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      const program = Effect.gen(function* () {
        const organizationSlug = yield* extractOrganizationSlug(request);
        const oauthUseCase = yield* ShopifyOAuthUseCase;

        return yield* oauthUseCase.handleInstallRequest(
          organizationSlug,
          request
        );
      });

      const effectProgram = Effect.gen(function* () {
        return yield* Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              program.pipe(
                Effect.provide(createOAuthServiceLayer()),
                Effect.catchAll((error) =>
                  Effect.succeed(matchInstallError(error))
                )
              )
            ),
          catch: (error) =>
            new EffectExecutionError({
              message: "Failed to execute install request",
              cause: error,
            }),
        });
      }).pipe(
        Effect.catchAll((error) =>
          Effect.succeed(
            Response.json(
              {
                error: "Failed to process install request",
                details: String(error),
              },
              { status: 500 }
            )
          )
        )
      );

      return Effect.runPromise(effectProgram);
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
      const extractOrganizationSlug = (
        state: Option.Option<string>
      ): Effect.Effect<OrganizationSlug, MissingShopParameterError> => {
        return Option.match(state, {
          onNone: () =>
            Effect.fail(
              new MissingShopParameterError({
                message: "State parameter is required",
              })
            ),
          onSome: (stateValue: string) => {
            if (!stateValue.includes("_org_")) {
              return Effect.fail(
                new MissingShopParameterError({
                  message: "Invalid state parameter format",
                })
              );
            }

            const parts = stateValue.split("_org_");
            const orgSlug = parts[0] as OrganizationSlug;

            if (!orgSlug) {
              return Effect.fail(
                new MissingShopParameterError({
                  message: "Organization slug not found in state",
                })
              );
            }

            return Effect.succeed(orgSlug);
          },
        });
      };

      const createErrorRedirect = (
        orgSlug: OrganizationSlug,
        errorMessage: string
      ) =>
        Effect.succeed(
          new Response(null, {
            status: 302,
            headers: {
              Location: new URL(
                `/organization/${orgSlug}?error=${encodeURIComponent(
                  errorMessage
                )}`,
                url.origin
              ).toString(),
              "Cache-Control": "no-cache",
            },
          })
        );

      // Create a fallback error redirect when we don't have org context
      const createFallbackErrorRedirect = (errorMessage: string) =>
        Effect.succeed(Response.json({ error: errorMessage }, { status: 400 }));

      if (shop) {
        const program = Effect.gen(function* () {
          const organizationSlug = yield* extractOrganizationSlug(
            Option.fromNullable(state)
          );
          const oauthUseCase = yield* ShopifyOAuthUseCase;

          yield* Effect.logInfo("OAuth callback: Starting OAuth flow", {
            organizationSlug,
            shopDomain: shop,
          });

          // Step 1: Complete OAuth flow
          const oauthResult = yield* oauthUseCase.handleCallback(
            organizationSlug,
            request
          );

          yield* Effect.logInfo(
            "OAuth callback: OAuth flow completed successfully",
            {
              organizationSlug,
              shopDomain: shop,
            }
          );

          // Step 2: Create store connection record (orchestrated at route level)
          const connectStoreService = yield* ConnectStoreApplicationService;

          const storeConnectionResult = yield* Effect.gen(function* () {
            yield* Effect.logInfo("OAuth callback: Starting store connection", {
              organizationSlug,
              shopDomain: shop,
            });

            const connectionResult =
              yield* connectStoreService.connectShopifyStore({
                organizationSlug,
                shopDomain: shop as ShopDomain,
              });

            yield* Effect.logInfo("OAuth callback: Store connection result", {
              organizationSlug,
              shopDomain: shop,
              success: connectionResult.success,
              message: connectionResult.message,
            });

            if (!connectionResult.success) {
              yield* Effect.logError(
                `Failed to create global store connection: ${connectionResult.message}`,
                {
                  organizationSlug,
                  shopDomain: shop,
                  error: connectionResult.error,
                }
              );
            } else {
              yield* Effect.logInfo(
                `Successfully created global store connection: ${connectionResult.message}`,
                {
                  organizationSlug,
                  shopDomain: shop,
                }
              );
            }

            return connectionResult;
          }).pipe(
            Effect.catchAll((error: unknown) => {
              // Log error but don't fail the overall flow
              return Effect.gen(function* () {
                yield* Effect.logError(
                  `Error creating global store connection: ${error}`,
                  {
                    organizationSlug,
                    shopDomain: shop,
                    errorType: typeof error,
                    errorMessage:
                      error instanceof Error ? error.message : String(error),
                  }
                );

                // Return a failure result but don't propagate the error
                return {
                  success: false,
                  message: `Store connection failed: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                  error: "STORE_CONNECTION_ERROR",
                };
              });
            })
          );

          yield* Effect.logInfo("OAuth callback: Flow completed", {
            organizationSlug,
            shopDomain: shop,
            oauthSuccess: true,
            storeConnectionSuccess: storeConnectionResult.success,
          });

          return oauthResult;
        });

        const effectProgram = Effect.gen(function* () {
          return yield* Effect.tryPromise({
            try: () =>
              Effect.runPromise(
                program.pipe(
                  Effect.provide(
                    Layer.mergeAll(
                      createOAuthServiceLayer(),
                      createStoreConnectionLayer()
                    )
                  ),
                  Effect.catchAll((error) => {
                    // Handle different error types appropriately
                    if (error instanceof MissingShopParameterError) {
                      return createFallbackErrorRedirect(
                        "Invalid OAuth state parameter"
                      );
                    }

                    // For other errors, we need to extract org slug again for redirect
                    return Effect.gen(function* () {
                      yield* Effect.logError(
                        "OAuth callback: Effect error caught",
                        {
                          error:
                            error instanceof Error
                              ? error.message
                              : String(error),
                          errorType: typeof error,
                          state,
                          shop,
                        }
                      );

                      const result = yield* extractOrganizationSlug(
                        Option.fromNullable(state)
                      );
                      return yield* createErrorRedirect(
                        result,
                        "OAuth authorization failed"
                      );
                    }).pipe(
                      Effect.catchAll((fallbackError) => {
                        return Effect.gen(function* () {
                          yield* Effect.logError(
                            "OAuth callback: Fallback error",
                            {
                              fallbackError:
                                fallbackError instanceof Error
                                  ? fallbackError.message
                                  : String(fallbackError),
                              originalError:
                                error instanceof Error
                                  ? error.message
                                  : String(error),
                            }
                          );

                          return yield* createFallbackErrorRedirect(
                            "OAuth authorization failed"
                          );
                        });
                      })
                    );
                  })
                )
              ),
            catch: (error) =>
              new EffectExecutionError({
                message: "Failed to execute OAuth callback",
                cause: error,
              }),
          });
        }).pipe(
          Effect.catchAll((error) => {
            // Handle unexpected errors - try to extract org slug for redirect
            return Effect.gen(function* () {
              yield* Effect.logError("OAuth callback: Unexpected error", {
                error: error instanceof Error ? error.message : String(error),
                errorType: typeof error,
                state,
                shop,
              });

              const result = yield* extractOrganizationSlug(
                Option.fromNullable(state)
              );
              return yield* createErrorRedirect(
                result,
                "Unexpected error during OAuth callback"
              );
            }).pipe(
              Effect.catchAll((fallbackError) => {
                return Effect.gen(function* () {
                  yield* Effect.logError(
                    "OAuth callback: Final fallback error",
                    {
                      fallbackError:
                        fallbackError instanceof Error
                          ? fallbackError.message
                          : String(fallbackError),
                      originalError:
                        error instanceof Error ? error.message : String(error),
                    }
                  );

                  return yield* createFallbackErrorRedirect(
                    "Unexpected error during OAuth callback"
                  );
                });
              })
            );
          })
        );

        return Effect.runPromise(effectProgram);
      }

      // SECURITY: If we don't have shop parameter, we can't process the OAuth callback properly.
      // We NEVER use a fallback organization as this could lead to:
      // 1. OAuth tokens being associated with the wrong organization
      // 2. Store connections being created under the wrong organization
      // 3. Data leakage between organizations
      // A missing shop parameter indicates a malformed or invalid OAuth callback.
      return Response.json(
        {
          error: "Invalid OAuth callback",
          message:
            "Missing shop parameter - cannot process OAuth callback without shop information",
        },
        { status: 400 }
      );
    }
  ),
];
