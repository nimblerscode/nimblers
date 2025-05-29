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
} from "@/domain/global/shopify/oauth/models";
import { AccessTokenService } from "@/domain/global/shopify/oauth/service";
import { DrizzleShopifyOAuthClient } from "./drizzle";
import { makeShopifyOAuthDrizzleAdapter } from "./ShopifyOAuthDrizzleAdapter";

export const AccessTokenRepoLive = Layer.effect(
  AccessTokenService,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleShopifyOAuthClient;
    const adapter = makeShopifyOAuthDrizzleAdapter(drizzleClient.db);

    return {
      exchangeCodeForToken: (
        shop: ShopDomain,
        code: AuthorizationCode,
        clientId: ClientId,
        clientSecret: ClientSecret,
      ) =>
        Effect.gen(function* () {
          const tokenUrl = `https://${shop}/admin/oauth/access_token`;

          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(tokenUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  client_id: clientId,
                  client_secret: clientSecret,
                  code,
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
              }),
            );
          }

          const tokenData = yield* Effect.tryPromise({
            try: () => response.json(),
            catch: (error) =>
              new AccessTokenError({
                message: "Failed to parse token response",
                cause: error,
              }),
          });

          return tokenData as AccessTokenResponse | OnlineAccessTokenResponse;
        }),

      store: (shop: ShopDomain, token: AccessToken, scope: Scope) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () => adapter.storeAccessToken(shop, token, scope),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store access token",
                cause: error,
              }),
          });
        }),

      retrieve: (shop: ShopDomain) =>
        Effect.gen(function* () {
          const tokenRecord = yield* Effect.tryPromise({
            try: () => adapter.retrieveAccessToken(shop),
            catch: (error) =>
              new OAuthError({
                message: "Failed to retrieve access token",
                cause: error,
              }),
          });

          return (tokenRecord?.accessToken as AccessToken) || null;
        }),

      delete: (shop: ShopDomain) =>
        Effect.gen(function* () {
          const deleted = yield* Effect.tryPromise({
            try: () => adapter.deleteAccessToken(shop),
            catch: (error) =>
              new OAuthError({
                message: "Failed to delete access token",
                cause: error,
              }),
          });

          return Boolean(deleted);
        }),
    };
  }),
);
