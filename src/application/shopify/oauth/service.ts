import { Context, Effect, Layer, Schema as S } from "effect";
import { EnvironmentConfigService } from "@/domain/global/environment/service";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import {
  type AccessToken,
  type ClientId,
  type ClientSecret,
  InvalidHmacError,
  InvalidNonceError,
  InvalidShopDomainError,
  type Nonce,
  OAuthCallbackRequestSchema,
  OAuthError,
  OAuthInstallRequestSchema,
  type Scope,
  type ShopDomain,
} from "@/domain/shopify/oauth/models";
import {
  AccessTokenService,
  NonceManager,
  ShopifyOAuthHmacVerifier,
  ShopifyOAuthUseCase,
  ShopValidator,
  WebhookService,
} from "@/domain/shopify/oauth/service";

// Environment binding for Shopify OAuth
export abstract class ShopifyOAuthEnv extends Context.Tag(
  "@core/shopify/oauth/Env"
)<
  ShopifyOAuthEnv,
  {
    SHOPIFY_CLIENT_ID: string;
    SHOPIFY_CLIENT_SECRET: string;
  }
>() {}

export const ShopifyOAuthUseCaseLive: Layer.Layer<
  ShopifyOAuthUseCase,
  never,
  | ShopifyOAuthHmacVerifier
  | NonceManager
  | AccessTokenService
  | ShopValidator
  | ShopifyOAuthEnv
  | WebhookService
  | EnvironmentConfigService
> = Layer.effect(
  ShopifyOAuthUseCase,
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyOAuthHmacVerifier;
    const nonceManager = yield* NonceManager;
    const accessTokenService = yield* AccessTokenService;
    const shopValidator = yield* ShopValidator;
    const env = yield* ShopifyOAuthEnv;
    const webhookService = yield* WebhookService;
    const envConfig = yield* EnvironmentConfigService;

    // Helper function to extract parameters from both query params and form data
    const extractRequestParams = (request: Request) =>
      Effect.gen(function* () {
        const url = new URL(request.url);

        // Start with query parameters
        const params = Object.fromEntries(url.searchParams);

        // If it's a POST request, also check for form data
        if (request.method === "POST") {
          const contentType = request.headers.get("content-type") || "";

          if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = yield* Effect.tryPromise({
              try: () => request.text(),
              catch: (error) =>
                new OAuthError({
                  message: "Failed to read form data",
                  cause: error,
                }),
            });
            const formParams = new URLSearchParams(formData);
            // Merge form params with query params (form data takes precedence)
            for (const [key, value] of formParams) {
              params[key] = value;
            }
          } else if (contentType.includes("multipart/form-data")) {
            const formData = yield* Effect.tryPromise({
              try: () => request.formData(),
              catch: (error) =>
                new OAuthError({
                  message: "Failed to read form data",
                  cause: error,
                }),
            });
            // Merge form data with query params (form data takes precedence)
            for (const [key, value] of formData) {
              if (typeof value === "string") {
                params[key] = value;
              }
            }
          }
        }

        return params;
      });

    return {
      handleInstallRequest: (
        organizationSlug: OrganizationSlug,
        request: Request
      ) =>
        Effect.gen(function* () {
          const params = yield* extractRequestParams(request);

          // Parse and validate the install request
          const installRequest = yield* S.decodeUnknown(
            OAuthInstallRequestSchema
          )(params).pipe(
            Effect.mapError((error) => {
              // Check if this is specifically a shop domain validation error
              // Look for ShopDomain pattern validation errors but exclude cases where shop is valid
              const errorString = JSON.stringify(error);
              const isShopDomainError =
                errorString.includes("ShopDomain") &&
                (errorString.includes('"path":["shop"]') ||
                  errorString.includes("Expected") ||
                  errorString.includes("pattern"));

              // Only throw InvalidShopDomainError if:
              // 1. It's a ShopDomain error AND
              // 2. The shop parameter exists but doesn't match the expected pattern
              if (
                isShopDomainError &&
                params.shop &&
                params.shop !== "" &&
                !params.shop.includes(".myshopify.com")
              ) {
                return new InvalidShopDomainError({
                  shop: params.shop as ShopDomain,
                  message: "Invalid shop domain format",
                });
              }
              return new OAuthError({
                message: "Invalid install request parameters",
                cause: error,
              });
            })
          );

          // Verify HMAC signature
          const clientSecret = env.SHOPIFY_CLIENT_SECRET as ClientSecret;
          if (!clientSecret) {
            return yield* Effect.fail(
              new OAuthError({
                message: "Missing Shopify client secret",
              })
            );
          }

          const isValidHmac = yield* hmacVerifier.verifyInstallRequest(
            installRequest,
            clientSecret
          );
          if (!isValidHmac) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Invalid HMAC signature for install request",
              })
            );
          }

          // Validate shop domain
          const shop = yield* shopValidator.validateShopDomain(
            installRequest.shop
          );

          // Check if we already have a token for this shop
          const existingToken = yield* accessTokenService.retrieve(shop);
          if (existingToken) {
            // Redirect to app with existing token using environment config
            const appUrl = envConfig.getOrganizationUrl(organizationSlug);
            return new Response(null, {
              status: 302,
              headers: {
                Location: appUrl,
                "Cache-Control": "no-cache",
              },
            });
          }

          // Generate nonce and build authorization URL
          const nonce = yield* nonceManager.generate();
          yield* nonceManager.store(nonce);

          // Encode organization slug in state parameter for callback
          const stateWithOrg = `${organizationSlug}_org_${nonce}`;

          const clientId = env.SHOPIFY_CLIENT_ID as ClientId;
          const scopes = ["read_products", "write_products"] as Scope[]; // Configure as needed
          const redirectUri = envConfig.getShopifyOAuthCallbackUrl();

          const authUrl = yield* Effect.succeed(
            `https://${shop}/admin/oauth/authorize?` +
              `client_id=${clientId}&` +
              `scope=${scopes.join(",")}&` +
              `redirect_uri=${encodeURIComponent(redirectUri)}&` +
              `state=${stateWithOrg}` // Use organization-encoded state
          );

          // Check if embedded and handle iframe escape
          if (installRequest.embedded === "1") {
            // Return HTML that uses Shopify App Bridge to escape iframe
            const html = `
              <!DOCTYPE html>
              <html>
                <head>
                  <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
                </head>
                <body>
                  <script>
                    const AppBridge = window['app-bridge'];
                    const createApp = AppBridge.default;
                    const { Redirect } = AppBridge.actions;
                    
                    const app = createApp({
                      apiKey: '${clientId}',
                      host: '${Buffer.from(shop)
                        .toString("base64")
                        .replace(/=/g, "")}'
                    });
                    
                    const redirect = Redirect.create(app);
                    redirect.dispatch(Redirect.Action.REMOTE, '${authUrl}');
                  </script>
                </body>
              </html>
            `;

            return new Response(html, {
              headers: {
                "Content-Type": "text/html",
                "X-Frame-Options": "ALLOWALL",
              },
            });
          }

          // Direct redirect for non-embedded apps
          return new Response(null, {
            status: 302,
            headers: {
              Location: authUrl,
              "Cache-Control": "no-cache",
            },
          });
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.handleInstallRequest")),

      handleCallback: (organizationSlug: OrganizationSlug, request: Request) =>
        Effect.gen(function* () {
          const params = yield* extractRequestParams(request);

          // Parse and validate the callback request
          const callbackRequest = yield* S.decodeUnknown(
            OAuthCallbackRequestSchema
          )(params).pipe(
            Effect.mapError((error) => {
              // Check if this is specifically a shop domain validation error
              // Look for ShopDomain pattern validation errors but exclude cases where shop is valid
              const errorString = JSON.stringify(error);
              const isShopDomainError =
                errorString.includes("ShopDomain") &&
                (errorString.includes('"path":["shop"]') ||
                  errorString.includes("Expected") ||
                  errorString.includes("pattern"));

              // Only throw InvalidShopDomainError if:
              // 1. It's a ShopDomain error AND
              // 2. The shop parameter exists but doesn't match the expected pattern
              if (
                isShopDomainError &&
                params.shop &&
                params.shop !== "" &&
                !params.shop.includes(".myshopify.com")
              ) {
                return new InvalidShopDomainError({
                  shop: params.shop as ShopDomain,
                  message: "Invalid shop domain format",
                });
              }
              return new OAuthError({
                message: "Invalid callback request parameters",
                cause: error,
              });
            })
          );

          // Verify HMAC signature
          const clientSecret = env.SHOPIFY_CLIENT_SECRET as ClientSecret;
          if (!clientSecret) {
            return yield* Effect.fail(
              new OAuthError({
                message: "Missing Shopify client secret",
              })
            );
          }

          const isValidHmac = yield* hmacVerifier.verifyCallbackRequest(
            callbackRequest,
            clientSecret
          );
          if (!isValidHmac) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Invalid HMAC signature for callback request",
              })
            );
          }

          // Verify and consume nonce - extract organizationSlug from state
          const stateParts = callbackRequest.state.split("_org_");
          const organizationSlugFromState = stateParts[0] as OrganizationSlug;
          const actualNonce = stateParts[1] as Nonce;

          const isValidNonce = yield* nonceManager.verify(actualNonce);
          if (!isValidNonce) {
            return yield* Effect.fail(
              new InvalidNonceError({
                message: "Invalid or expired nonce",
              })
            );
          }
          yield* nonceManager.consume(actualNonce);

          // Validate shop domain
          const shop = yield* shopValidator.validateShopDomain(
            callbackRequest.shop
          );

          // Exchange authorization code for access token
          const clientId = env.SHOPIFY_CLIENT_ID as ClientId;
          const tokenResponse = yield* accessTokenService.exchangeCodeForToken(
            shop,
            callbackRequest.code,
            clientId,
            clientSecret
          );

          // Store the access token with organization context from state
          yield* accessTokenService.store(
            shop,
            tokenResponse.access_token,
            tokenResponse.scope,
            organizationSlugFromState // Use org slug extracted from state
          );

          // Register webhooks after successful installation
          yield* Effect.gen(function* () {
            const webhookUrl = envConfig.getShopifyWebhookUrl(
              "/shopify/webhooks/app/uninstalled"
            );

            // Skip webhook registration in development to avoid Shopify tunnel URL rejection
            if (webhookUrl === "SKIP_WEBHOOK_REGISTRATION") {
              yield* Effect.logInfo(
                "Webhook registration skipped in development environment"
              );
              return;
            }

            yield* webhookService.registerAppUninstallWebhook(
              shop,
              tokenResponse.access_token,
              webhookUrl
            );
          }).pipe(
            Effect.catchAll((error) => {
              // Log webhook registration errors but don't fail the OAuth flow
              return Effect.gen(function* () {
                yield* Effect.logError(
                  `Webhook registration failed: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                  {
                    shop,
                    webhookUrl: envConfig.getShopifyWebhookUrl(
                      "/shopify/webhooks/app/uninstalled"
                    ),
                    errorType: typeof error,
                  }
                );

                // Check if it's a "webhook already exists" error (422 status)
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                if (
                  errorMessage.includes("422") &&
                  errorMessage.includes("already been taken")
                ) {
                  yield* Effect.logInfo(
                    "Webhook already exists - continuing with OAuth flow",
                    { shop }
                  );
                } else {
                  yield* Effect.logWarning(
                    "Unexpected webhook registration error - continuing with OAuth flow",
                    { shop, error: errorMessage }
                  );
                }

                // Return success to continue the OAuth flow
                return;
              });
            })
          );

          // Redirect to app using environment config
          const appUrl = envConfig.getOrganizationUrl(organizationSlug);
          return new Response(null, {
            status: 302,
            headers: {
              Location: appUrl,
            },
          });
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.handleCallback")),

      buildAuthorizationUrl: (
        shop: ShopDomain,
        clientId: ClientId,
        scopes: Scope[],
        redirectUri: string,
        nonce: Nonce
      ) =>
        Effect.succeed(
          `https://${shop}/admin/oauth/authorize?` +
            `client_id=${clientId}&` +
            `scope=${scopes.join(",")}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${nonce}`
        ).pipe(Effect.withSpan("ShopifyOAuthUseCase.buildAuthorizationUrl")),

      checkConnectionStatus: (
        organizationSlug: OrganizationSlug,
        shop: ShopDomain
      ) =>
        Effect.gen(function* () {
          // Check if we have a stored access token
          const accessToken = yield* accessTokenService.retrieve(shop).pipe(
            Effect.mapError(
              (error) =>
                new OAuthError({
                  message: "Failed to check connection status",
                  cause: error,
                })
            )
          );

          if (accessToken) {
            // We have a token, connection is active
            return {
              connected: true,
              shop,
              scope: "read_products,write_products" as Scope,
            };
          }

          // No token found
          return {
            connected: false,
            shop,
          };
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.checkConnectionStatus")),

      disconnect: (organizationSlug: OrganizationSlug, shop: ShopDomain) =>
        Effect.gen(function* () {
          // Use the AccessTokenService delete method to remove the token
          yield* accessTokenService.delete(shop);

          return {
            success: true, // Return boolean success as expected by interface
          };
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.disconnect")),

      registerWebhooksAfterInstall: (
        shop: ShopDomain,
        accessToken: AccessToken
      ) =>
        Effect.gen(function* () {
          // Register the app/uninstalled webhook
          const webhookUrl = envConfig.getShopifyWebhookUrl(
            "/shopify/webhooks/app/uninstalled"
          );

          // Skip webhook registration in development to avoid Shopify tunnel URL rejection
          if (webhookUrl === "SKIP_WEBHOOK_REGISTRATION") {
            yield* Effect.logInfo(
              "Webhook registration skipped in development environment"
            );
            return;
          }

          yield* webhookService.registerAppUninstallWebhook(
            shop,
            accessToken,
            webhookUrl
          );
        }).pipe(
          Effect.withSpan("ShopifyOAuthUseCase.registerWebhooksAfterInstall")
        ),
    };
  })
);
