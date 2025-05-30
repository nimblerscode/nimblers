import { Effect, Layer } from "effect";
import {
  type AccessToken,
  AccessTokenError,
  type AccessTokenResponse,
  type AuthorizationCode,
  type ClientId,
  type ClientSecret,
  OAuthError,
  type OnlineAccessTokenResponse,
  type Scope,
  type ShopDomain,
} from "@/domain/shopify/oauth/models";
import { AccessTokenService } from "@/domain/shopify/oauth/service";
import { ShopifyOAuthDONamespace } from "./shopifyOAuthDO";

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
        organizationId: string,
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
                  organizationId,
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

      retrieve: (organizationId: string, shop: ShopDomain) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch(
                `http://internal/token?organizationId=${encodeURIComponent(
                  organizationId
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

      delete: (organizationId: string, shop: ShopDomain) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              doStub.fetch("http://internal/token/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId, shop }),
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
