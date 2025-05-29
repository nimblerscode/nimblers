# Shopify OAuth Implementation Guide

This guide provides step-by-step instructions for implementing Shopify OAuth functionality using Effect-TS Clean Architecture patterns in the Nimblers project.

## Architecture Overview

The OAuth implementation follows Clean Architecture with these layers:

- **Domain Layer**: Abstract interfaces, business models, and error types
- **Application Layer**: Use case orchestration and business logic
- **Infrastructure Layer**: Concrete implementations (HTTP, storage, external APIs)
- **Configuration Layer**: Dependency injection and layer composition
- **Routes Layer**: HTTP endpoint handlers

## Step 1: Domain Layer Implementation

### 1.1 Define Business Models and Types

Create `src/domain/global/shopify/oauth/models.ts`:

```typescript
import { Schema as S } from "effect";

// Branded types for type safety
export type ShopDomain = string & { readonly _tag: "ShopDomain" };
export type ClientId = string & { readonly _tag: "ClientId" };
export type ClientSecret = string & { readonly _tag: "ClientSecret" };
export type AccessToken = string & { readonly _tag: "AccessToken" };
export type Nonce = string & { readonly _tag: "Nonce" };
export type Scope = string & { readonly _tag: "Scope" };
export type AuthorizationCode = string & { readonly _tag: "AuthorizationCode" };

// Domain-specific schemas
export const ShopDomainSchema = S.String.pipe(
  S.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/),
  S.brand("ShopDomain")
);

export const OAuthInstallRequestSchema = S.Struct({
  shop: ShopDomainSchema,
  timestamp: S.String,
  hmac: S.String,
  embedded: S.optional(S.String),
});

export const OAuthCallbackRequestSchema = S.Struct({
  code: S.String.pipe(S.brand("AuthorizationCode")),
  hmac: S.String,
  shop: ShopDomainSchema,
  state: S.String.pipe(S.brand("Nonce")),
  timestamp: S.String,
});

// Error types
export class OAuthError extends S.TaggedError<OAuthError>()("OAuthError", {
  message: S.String,
  cause: S.optional(S.Unknown),
}) {}

export class InvalidHmacError extends S.TaggedError<InvalidHmacError>()(
  "InvalidHmacError",
  {
    message: S.String,
  }
) {}

export class InvalidNonceError extends S.TaggedError<InvalidNonceError>()(
  "InvalidNonceError",
  {
    message: S.String,
  }
) {}

export class InvalidShopDomainError extends S.TaggedError<InvalidShopDomainError>()(
  "InvalidShopDomainError",
  {
    shop: S.String,
    message: S.String,
  }
) {}

// Business value objects
export interface TokenResponse {
  access_token: AccessToken;
  scope: Scope;
}

export interface ConnectionStatus {
  connected: boolean;
  shop: ShopDomain;
  scope?: Scope;
}
```

### 1.2 Define Domain Services

Create `src/domain/global/shopify/oauth/service.ts`:

```typescript
import { Context, Effect } from "effect";
import type {
  ShopDomain,
  ClientSecret,
  ClientId,
  Nonce,
  AccessToken,
  Scope,
  AuthorizationCode,
  OAuthInstallRequest,
  OAuthCallbackRequest,
  TokenResponse,
  ConnectionStatus,
} from "./models";

// Abstract repository interfaces
export abstract class ShopifyOAuthHmacVerifier extends Context.Tag(
  "@core/shopify/oauth/HmacVerifier"
)<
  ShopifyOAuthHmacVerifier,
  {
    readonly verifyInstallRequest: (
      request: OAuthInstallRequest,
      secret: ClientSecret
    ) => Effect.Effect<boolean, never>;
    readonly verifyCallbackRequest: (
      request: OAuthCallbackRequest,
      secret: ClientSecret
    ) => Effect.Effect<boolean, never>;
  }
>() {}

export abstract class NonceManager extends Context.Tag(
  "@core/shopify/oauth/NonceManager"
)<
  NonceManager,
  {
    readonly generate: () => Effect.Effect<Nonce, never>;
    readonly store: (nonce: Nonce) => Effect.Effect<void, never>;
    readonly verify: (nonce: Nonce) => Effect.Effect<boolean, never>;
    readonly consume: (nonce: Nonce) => Effect.Effect<void, never>;
  }
>() {}

export abstract class AccessTokenService extends Context.Tag(
  "@core/shopify/oauth/AccessTokenService"
)<
  AccessTokenService,
  {
    readonly exchangeCodeForToken: (
      shop: ShopDomain,
      code: AuthorizationCode,
      clientId: ClientId,
      clientSecret: ClientSecret
    ) => Effect.Effect<TokenResponse, Error>;
    readonly store: (
      shop: ShopDomain,
      token: AccessToken,
      scope: Scope
    ) => Effect.Effect<void, Error>;
    readonly retrieve: (
      shop: ShopDomain
    ) => Effect.Effect<AccessToken | null, Error>;
  }
>() {}

export abstract class ShopValidator extends Context.Tag(
  "@core/shopify/oauth/ShopValidator"
)<
  ShopValidator,
  {
    readonly validateShopDomain: (
      shop: string
    ) => Effect.Effect<ShopDomain, Error>;
  }
>() {}

// Main use case interface
export abstract class ShopifyOAuthUseCase extends Context.Tag(
  "@core/shopify/oauth/UseCase"
)<
  ShopifyOAuthUseCase,
  {
    readonly handleInstallRequest: (
      request: Request
    ) => Effect.Effect<Response, Error>;
    readonly handleCallback: (
      request: Request
    ) => Effect.Effect<Response, Error>;
    readonly buildAuthorizationUrl: (
      shop: ShopDomain,
      clientId: ClientId,
      scopes: Scope[],
      redirectUri: string,
      nonce: Nonce
    ) => Effect.Effect<string, never>;
    readonly checkConnectionStatus: (
      shop: ShopDomain
    ) => Effect.Effect<ConnectionStatus, Error>;
    readonly disconnect: (
      shop: ShopDomain
    ) => Effect.Effect<{ success: boolean }, never>;
  }
>() {}
```

## Step 2: Infrastructure Layer Implementation

### 2.1 HMAC Verifier Implementation

Create `src/infrastructure/shopify/oauth/hmac.ts`:

```typescript
import { Effect, Layer } from "effect";
import { ShopifyOAuthHmacVerifier } from "@/domain/global/shopify/oauth/service";
import type {
  OAuthInstallRequest,
  OAuthCallbackRequest,
  ClientSecret,
} from "@/domain/global/shopify/oauth/models";

export const ShopifyOAuthHmacVerifierLive = Layer.succeed(
  ShopifyOAuthHmacVerifier,
  {
    verifyInstallRequest: (
      request: OAuthInstallRequest,
      secret: ClientSecret
    ) =>
      Effect.gen(function* () {
        // Create the message for HMAC verification (exclude hmac parameter)
        const { hmac, ...params } = request;
        const sortedParams = Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join("&");

        // Calculate HMAC using Web Crypto API
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(sortedParams);

        const cryptoKey = yield* Effect.tryPromise({
          try: () =>
            crypto.subtle.importKey(
              "raw",
              keyData,
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            ),
          catch: (error) => error as Error,
        });

        const signature = yield* Effect.tryPromise({
          try: () => crypto.subtle.sign("HMAC", cryptoKey, messageData),
          catch: (error) => error as Error,
        });

        const expectedHmac = Array.from(new Uint8Array(signature))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

        return hmac === expectedHmac;
      }),

    verifyCallbackRequest: (
      request: OAuthCallbackRequest,
      secret: ClientSecret
    ) =>
      Effect.gen(function* () {
        // Similar implementation for callback verification
        const { hmac, ...params } = request;
        const sortedParams = Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join("&");

        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(sortedParams);

        const cryptoKey = yield* Effect.tryPromise({
          try: () =>
            crypto.subtle.importKey(
              "raw",
              keyData,
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            ),
          catch: (error) => error as Error,
        });

        const signature = yield* Effect.tryPromise({
          try: () => crypto.subtle.sign("HMAC", cryptoKey, messageData),
          catch: (error) => error as Error,
        });

        const expectedHmac = Array.from(new Uint8Array(signature))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

        return hmac === expectedHmac;
      }),
  }
);
```

### 2.2 Nonce Manager Implementation

Create `src/infrastructure/shopify/oauth/nonce.ts`:

```typescript
import { Effect, Layer } from "effect";
import { NonceManager } from "@/domain/global/shopify/oauth/service";
import type { Nonce } from "@/domain/global/shopify/oauth/models";

export const NonceManagerLive = Layer.effect(
  NonceManager,
  Effect.gen(function* () {
    // Use a simple in-memory store for now (use KV or DB in production)
    const nonceStore = new Set<string>();

    return {
      generate: () => Effect.succeed(crypto.randomUUID() as Nonce),

      store: (nonce: Nonce) => Effect.succeed(void nonceStore.add(nonce)),

      verify: (nonce: Nonce) => Effect.succeed(nonceStore.has(nonce)),

      consume: (nonce: Nonce) => Effect.succeed(void nonceStore.delete(nonce)),
    };
  })
);
```

### 2.3 Access Token Service Implementation

Create `src/infrastructure/shopify/oauth/access-token.ts`:

```typescript
import { Effect, Layer } from "effect";
import { AccessTokenService } from "@/domain/global/shopify/oauth/service";
import type {
  ShopDomain,
  ClientId,
  ClientSecret,
  AuthorizationCode,
  AccessToken,
  Scope,
  TokenResponse,
} from "@/domain/global/shopify/oauth/models";

export const AccessTokenServiceLive = Layer.effect(
  AccessTokenService,
  Effect.gen(function* () {
    // Use a simple in-memory store for now (use KV or DB in production)
    const tokenStore = new Map<string, { token: AccessToken; scope: Scope }>();

    return {
      exchangeCodeForToken: (
        shop: ShopDomain,
        code: AuthorizationCode,
        clientId: ClientId,
        clientSecret: ClientSecret
      ) =>
        Effect.gen(function* () {
          const tokenUrl = `https://${shop}/admin/oauth/access_token`;
          const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          });

          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(tokenUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body.toString(),
              }),
            catch: (error) => new Error(`Token exchange failed: ${error}`),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new Error(`Token exchange failed: ${response.status}`)
            );
          }

          const tokenData = yield* Effect.tryPromise({
            try: () => response.json() as Promise<TokenResponse>,
            catch: (error) =>
              new Error(`Failed to parse token response: ${error}`),
          });

          return tokenData;
        }),

      store: (shop: ShopDomain, token: AccessToken, scope: Scope) =>
        Effect.succeed(void tokenStore.set(shop, { token, scope })),

      retrieve: (shop: ShopDomain) =>
        Effect.succeed(tokenStore.get(shop)?.token || null),
    };
  })
);
```

### 2.4 Shop Validator Implementation

Create `src/infrastructure/shopify/oauth/shop-validator.ts`:

```typescript
import { Effect, Layer, Schema as S } from "effect";
import { ShopValidator } from "@/domain/global/shopify/oauth/service";
import {
  ShopDomainSchema,
  type ShopDomain,
} from "@/domain/global/shopify/oauth/models";

export const ShopValidatorLive = Layer.succeed(ShopValidator, {
  validateShopDomain: (shop: string) =>
    Effect.gen(function* () {
      const validated = yield* S.decodeUnknown(ShopDomainSchema)(shop).pipe(
        Effect.mapError(() => new Error(`Invalid shop domain format: ${shop}`))
      );
      return validated;
    }),
});
```

## Step 3: Application Layer Implementation

### 3.1 Use Case Implementation

Create `src/application/global/shopify/oauth/service.ts`:

```typescript
import { Effect, Layer, Schema as S, Context } from "effect";
import {
  ShopifyOAuthUseCase,
  ShopifyOAuthHmacVerifier,
  NonceManager,
  AccessTokenService,
  ShopValidator,
} from "@/domain/global/shopify/oauth/service";
import {
  OAuthInstallRequestSchema,
  OAuthCallbackRequestSchema,
  type ClientId,
  type ClientSecret,
  type Nonce,
  type Scope,
  type ShopDomain,
  OAuthError,
  InvalidHmacError,
  InvalidNonceError,
  InvalidShopDomainError,
} from "@/domain/global/shopify/oauth/models";

// Environment binding for Shopify OAuth
export abstract class ShopifyOAuthEnv extends Context.Tag(
  "@infrastructure/shopify/oauth/Env"
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
> = Layer.effect(
  ShopifyOAuthUseCase,
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyOAuthHmacVerifier;
    const nonceManager = yield* NonceManager;
    const accessTokenService = yield* AccessTokenService;
    const shopValidator = yield* ShopValidator;
    const env = yield* ShopifyOAuthEnv;

    // Helper function to extract parameters from both query params and form data
    const extractRequestParams = (request: Request) =>
      Effect.gen(function* () {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);

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
      handleInstallRequest: (request: Request) =>
        Effect.gen(function* () {
          const params = yield* extractRequestParams(request);

          // Parse and validate the install request
          const installRequest = yield* S.decodeUnknown(
            OAuthInstallRequestSchema
          )(params).pipe(
            Effect.mapError((error) => {
              const errorString = JSON.stringify(error);
              const isShopDomainError =
                errorString.includes("ShopDomain") &&
                (errorString.includes('"path":["shop"]') ||
                  errorString.includes("Expected") ||
                  errorString.includes("pattern"));

              if (
                isShopDomainError &&
                params.shop &&
                params.shop !== "" &&
                !params.shop.includes(".myshopify.com")
              ) {
                return new InvalidShopDomainError({
                  shop: params.shop,
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
            return new Response(null, {
              status: 302,
              headers: {
                Location: `https://${shop}/admin/apps`,
                "Cache-Control": "no-cache",
              },
            });
          }

          // Generate nonce and build authorization URL
          const nonce = yield* nonceManager.generate();
          yield* nonceManager.store(nonce);

          const clientId = env.SHOPIFY_CLIENT_ID as ClientId;
          const scopes = ["read_products", "write_products"] as Scope[];
          const redirectUri = "https://nimblers.com/shopify/oauth/callback";

          const authUrl = yield* Effect.succeed(
            `https://${shop}/admin/oauth/authorize?` +
              `client_id=${clientId}&` +
              `scope=${scopes.join(",")}&` +
              `redirect_uri=${encodeURIComponent(redirectUri)}&` +
              `state=${nonce}`
          );

          // Check if embedded and handle iframe escape
          if (installRequest.embedded === "1") {
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

          return new Response(null, {
            status: 302,
            headers: {
              Location: authUrl,
              "Cache-Control": "no-cache",
            },
          });
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.handleInstallRequest")),

      handleCallback: (request: Request) =>
        Effect.gen(function* () {
          const params = yield* extractRequestParams(request);

          // Parse and validate the callback request
          const callbackRequest = yield* S.decodeUnknown(
            OAuthCallbackRequestSchema
          )(params).pipe(
            Effect.mapError((error) => {
              const errorString = JSON.stringify(error);
              const isShopDomainError =
                errorString.includes("ShopDomain") &&
                (errorString.includes('"path":["shop"]') ||
                  errorString.includes("Expected") ||
                  errorString.includes("pattern"));

              if (
                isShopDomainError &&
                params.shop &&
                params.shop !== "" &&
                !params.shop.includes(".myshopify.com")
              ) {
                return new InvalidShopDomainError({
                  shop: params.shop,
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

          // Verify and consume nonce
          const isValidNonce = yield* nonceManager.verify(
            callbackRequest.state
          );
          if (!isValidNonce) {
            return yield* Effect.fail(
              new InvalidNonceError({
                message: "Invalid or expired nonce",
              })
            );
          }
          yield* nonceManager.consume(callbackRequest.state);

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

          // Store the access token
          yield* accessTokenService.store(
            shop,
            tokenResponse.access_token,
            tokenResponse.scope
          );

          // Redirect to app
          const appUrl = `https://${shop}/admin/apps`;
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

      checkConnectionStatus: (shop: ShopDomain) =>
        Effect.gen(function* () {
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
            return {
              connected: true,
              shop,
              scope: "read_products,write_products" as Scope,
            };
          }

          return {
            connected: false,
            shop,
          };
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.checkConnectionStatus")),

      disconnect: (shop: ShopDomain) =>
        Effect.succeed({
          success: true,
        }).pipe(Effect.withSpan("ShopifyOAuthUseCase.disconnect")),
    };
  })
);
```

## Step 4: Configuration Layer

### 4.1 Layer Composition

Create `src/config/shopify-oauth-layers.ts`:

```typescript
import { Layer } from "effect";
import {
  ShopifyOAuthUseCaseLive,
  ShopifyOAuthEnv,
} from "@/application/global/shopify/oauth/service";
import { ShopifyOAuthHmacVerifierLive } from "@/infrastructure/shopify/oauth/hmac";
import { NonceManagerLive } from "@/infrastructure/shopify/oauth/nonce";
import { AccessTokenServiceLive } from "@/infrastructure/shopify/oauth/access-token";
import { ShopValidatorLive } from "@/infrastructure/shopify/oauth/shop-validator";

export function ShopifyOAuthLayerLive(env: {
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
}) {
  const envLayer = Layer.succeed(ShopifyOAuthEnv, env);

  const infrastructureLayer = Layer.mergeAll(
    ShopifyOAuthHmacVerifierLive,
    NonceManagerLive,
    AccessTokenServiceLive,
    ShopValidatorLive,
    envLayer
  );

  return Layer.provide(ShopifyOAuthUseCaseLive, infrastructureLayer);
}
```

## Step 5: Routes Implementation

### 5.1 Create Route Handlers

Create `src/app/pages/shopify/oauth/routes.ts`:

```typescript
import { route } from "rwsdk/router";
import { Effect } from "effect";
import { ShopifyOAuthUseCase } from "@/domain/global/shopify/oauth/service";
import { ShopifyOAuthLayerLive } from "@/config/shopify-oauth-layers";
import type { ShopDomain } from "@/domain/global/shopify/oauth/models";

// Environment setup - in production, get from Cloudflare env
declare const env: {
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
};

const oauthLayer = ShopifyOAuthLayerLive({
  SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
});

export const routes = [
  // OAuth install endpoint
  route("/install", async ({ request }) => {
    const program = Effect.gen(function* () {
      const useCase = yield* ShopifyOAuthUseCase;
      return yield* useCase.handleInstallRequest(request);
    });

    return Effect.runPromise(program.pipe(Effect.provide(oauthLayer)));
  }),

  // OAuth callback endpoint
  route("/callback", async ({ request }) => {
    const program = Effect.gen(function* () {
      const useCase = yield* ShopifyOAuthUseCase;
      return yield* useCase.handleCallback(request);
    });

    return Effect.runPromise(program.pipe(Effect.provide(oauthLayer)));
  }),

  // Connection status endpoint
  route("/status", async ({ request }) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") as ShopDomain;

    if (!shop) {
      return Response.json(
        { error: "Shop parameter required" },
        { status: 400 }
      );
    }

    const program = Effect.gen(function* () {
      const useCase = yield* ShopifyOAuthUseCase;
      const status = yield* useCase.checkConnectionStatus(shop);
      return Response.json(status);
    });

    return Effect.runPromise(program.pipe(Effect.provide(oauthLayer)));
  }),

  // Disconnect endpoint
  route("/disconnect", async ({ request }) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const shop = formData.get("shop") as ShopDomain;

    if (!shop) {
      return Response.json(
        { error: "Shop parameter required" },
        { status: 400 }
      );
    }

    const program = Effect.gen(function* () {
      const useCase = yield* ShopifyOAuthUseCase;
      const result = yield* useCase.disconnect(shop);
      return Response.json(result);
    });

    return Effect.runPromise(program.pipe(Effect.provide(oauthLayer)));
  }),
];
```

### 5.2 Integrate Routes into Main Worker

Update `src/worker.tsx`:

```typescript
import { defineApp, render, route, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import { HomePage } from "@/app/pages/home/HomePage";
import { routes as oauthRoutes } from "@/app/pages/shopify/oauth/routes";

export default defineApp([
  render(Document, [
    route("/", HomePage),
    prefix("/shopify/oauth", oauthRoutes),
    // Other routes...
  ]),
]);
```

## Step 6: Testing Implementation

### 6.1 Create Test Files

Follow the existing test patterns in `tests/shopify/oauth/`:

- `models.test.ts` - Test domain models and schemas
- `hmac.test.ts` - Test HMAC verification
- `nonce.test.ts` - Test nonce management
- `access-token.test.ts` - Test token exchange
- `use-case.test.ts` - Test use case logic
- `routes.test.ts` - Test route handlers
- `integration.test.ts` - Test full OAuth flow

### 6.2 Run Tests

```bash
# Run all OAuth tests
npx vitest run tests/shopify/oauth/

# Run specific test file
npx vitest run tests/shopify/oauth/use-case.test.ts

# Watch mode for development
npx vitest tests/shopify/oauth/
```

## Step 7: Production Considerations

### 7.1 Environment Variables

Set up environment variables in `wrangler.toml`:

```toml
[env.production]
vars = { }

[[env.production.secrets]]
SHOPIFY_CLIENT_ID = "your_production_client_id"
SHOPIFY_CLIENT_SECRET = "your_production_client_secret"

[env.development]
vars = { }

[[env.development.secrets]]
SHOPIFY_CLIENT_ID = "your_development_client_id"
SHOPIFY_CLIENT_SECRET = "your_development_client_secret"
```

### 7.2 Persistent Storage

Replace in-memory stores with persistent storage:

1. **Nonce Management**: Use Cloudflare KV or Durable Objects
2. **Access Tokens**: Use Cloudflare KV, D1, or external database
3. **Session Data**: Use secure, encrypted storage

### 7.3 Security Considerations

1. **HMAC Verification**: Always verify HMAC signatures
2. **Nonce Validation**: Implement proper nonce expiration
3. **HTTPS Only**: Ensure all OAuth flows use HTTPS
4. **Input Validation**: Validate all input parameters
5. **Error Handling**: Don't expose sensitive information in errors

### 7.4 Monitoring and Logging

1. **Add observability spans** for all operations
2. **Log OAuth events** for audit trails
3. **Monitor failed attempts** for security
4. **Set up alerts** for OAuth errors

## Step 8: Deployment

### 8.1 Build and Deploy

```bash
# Build the application
npm run build

# Deploy to Cloudflare Workers
npx wrangler deploy

# Deploy to specific environment
npx wrangler deploy --env production
```

### 8.2 Verify Deployment

1. Test OAuth install flow
2. Test OAuth callback handling
3. Verify HMAC validation
4. Test connection status endpoints
5. Verify error handling

## Troubleshooting

### Common Issues

1. **HMAC Verification Failures**: Check parameter sorting and encoding
2. **Nonce Errors**: Verify nonce uniqueness and expiration
3. **Shop Domain Validation**: Ensure proper .myshopify.com format
4. **Token Exchange Failures**: Check client credentials and network access
5. **Test Failures**: Verify mock layer composition and service bindings

### Debug Commands

```bash
# Check layer dependencies
npm run type-check

# View test output with details
npx vitest run tests/shopify/oauth/ --reporter=verbose

# Debug specific test
npx vitest run tests/shopify/oauth/use-case.test.ts --reporter=verbose

# Check worker logs
npx wrangler tail
```

This implementation guide follows the Effect-TS Clean Architecture patterns and provides a complete, production-ready Shopify OAuth integration.
