import { Effect, Layer } from "effect";
import {
  type AccessToken,
  AccessTokenError,
  type AccessTokenResponse,
  type AuthorizationCode,
  type ClientId,
  type ClientSecret,
  InvalidNonceError,
  type Nonce,
  OAuthError,
  type OnlineAccessTokenResponse,
  type Scope,
  type ShopDomain,
} from "@/domain/shopify/oauth/models";
import { OrganizationSlug } from "@/domain/global/organization/models";
import {
  AccessTokenService,
  NonceManager,
} from "@/domain/shopify/oauth/service";
import { ShopifyOAuthDONamespace } from "./shopifyOAuthDO";

export const NonceManagerDOLive = Layer.effect(
  NonceManager,
  Effect.gen(function* () {
    const doNamespace = yield* ShopifyOAuthDONamespace;
    const doId = doNamespace.idFromName("shopify-oauth");
    const doStub = doNamespace.get(doId);

    return {
      generate: () =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/nonce/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }),
            catch: () => new Error("Network error"), // This should never fail according to domain
          });

          if (!response.ok) {
            return yield* Effect.die(
              new Error(
                `Nonce generation failed with status ${response.status}`
              )
            );
          }

          const data = yield* Effect.tryPromise({
            try: () => response.json() as Promise<{ nonce: string }>,
            catch: () => new Error("Parse error"), // This should never fail according to domain
          });

          return data.nonce as Nonce;
        }).pipe(
          Effect.orDie // Convert all errors to defects since domain expects never
        ),

      store: (organizationSlug: OrganizationSlug, nonce: Nonce) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/nonce/store", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: organizationSlug,
                  nonce,
                }),
              }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store nonce",
                cause: error,
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new OAuthError({
                message: `Nonce store failed with status ${response.status}`,
              })
            );
          }
        }),

      verify: (organizationSlug: OrganizationSlug, nonce: Nonce) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/nonce/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: organizationSlug,
                  nonce,
                }),
              }),
            catch: () =>
              new InvalidNonceError({
                message: "Failed to verify nonce",
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new InvalidNonceError({
                message: `Nonce verification failed with status ${response.status}`,
              })
            );
          }

          const data = yield* Effect.tryPromise({
            try: () => response.json() as Promise<{ valid: boolean }>,
            catch: () =>
              new InvalidNonceError({
                message: "Failed to parse nonce verification response",
              }),
          });

          return data.valid;
        }),

      consume: (organizationSlug: OrganizationSlug, nonce: Nonce) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/nonce/consume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: organizationSlug,
                  nonce,
                }),
              }),
            catch: () =>
              new InvalidNonceError({
                message: "Failed to consume nonce",
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new InvalidNonceError({
                message: `Nonce consumption failed with status ${response.status}`,
              })
            );
          }
        }),
    };
  })
);

export const AccessTokenServiceDOLive = Layer.effect(
  AccessTokenService,
  Effect.gen(function* () {
    const doNamespace = yield* ShopifyOAuthDONamespace;
    const doId = doNamespace.idFromName("shopify-oauth");
    const doStub = doNamespace.get(doId);

    return {
      exchangeCodeForToken: (
        shop: ShopDomain,
        code: AuthorizationCode,
        clientId: ClientId,
        clientSecret: ClientSecret
      ) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/token/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  shop,
                  code,
                  clientId,
                  clientSecret,
                }),
              }),
            catch: (error) =>
              new AccessTokenError({
                message: "Failed to exchange code for token",
                cause: error,
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new AccessTokenError({
                message: `Token exchange failed with status ${response.status}`,
              })
            );
          }

          const tokenData = yield* Effect.tryPromise({
            try: () =>
              response.json() as Promise<
                AccessTokenResponse | OnlineAccessTokenResponse
              >,
            catch: (error) =>
              new AccessTokenError({
                message: "Failed to parse token response",
                cause: error,
              }),
          });

          return tokenData;
        }),

      store: (
        organizationSlug: OrganizationSlug,
        shop: ShopDomain,
        token: AccessToken,
        scope: Scope
      ) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/token/store", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: organizationSlug,
                  shop,
                  accessToken: token,
                  scope,
                }),
              }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store access token",
                cause: error,
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new OAuthError({
                message: `Token store failed with status ${response.status}`,
              })
            );
          }
        }),

      retrieve: (organizationSlug: OrganizationSlug, shop: ShopDomain) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch(
                `http://internal/token?organizationId=${encodeURIComponent(
                  organizationSlug
                )}&shop=${encodeURIComponent(shop)}`,
                {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                }
              ),
            catch: (error) =>
              new OAuthError({
                message: "Failed to retrieve access token",
                cause: error,
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new OAuthError({
                message: `Token retrieve failed with status ${response.status}`,
              })
            );
          }

          const data = yield* Effect.tryPromise({
            try: () =>
              response.json() as Promise<{ accessToken: string | null }>,
            catch: (error) =>
              new OAuthError({
                message: "Failed to parse token retrieve response",
                cause: error,
              }),
          });

          return data.accessToken as AccessToken | null;
        }),

      delete: (organizationSlug: OrganizationSlug, shop: ShopDomain) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/token/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: organizationSlug,
                  shop,
                }),
              }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to delete access token",
                cause: error,
              }),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new OAuthError({
                message: `Token delete failed with status ${response.status}`,
              })
            );
          }

          const data = yield* Effect.tryPromise({
            try: () =>
              response.json() as Promise<{
                success: boolean;
                deleted: boolean;
              }>,
            catch: (error) =>
              new OAuthError({
                message: "Failed to parse token delete response",
                cause: error,
              }),
          });

          return data.deleted;
        }),
    };
  })
);
