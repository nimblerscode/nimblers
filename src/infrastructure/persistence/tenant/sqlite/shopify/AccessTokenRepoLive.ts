import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type {
  AccessToken,
  AccessTokenResponse,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  OnlineAccessTokenResponse,
  Scope,
  ShopDomain,
} from "@/domain/shopify/oauth/models";
import { AccessTokenError, OAuthError } from "@/domain/shopify/oauth/models";
import { AccessTokenService } from "@/domain/shopify/oauth/service";
import { DrizzleDOClient } from "../drizzle";
import { accessTokens } from "./schema";

export const AccessTokenRepoLive = Layer.effect(
  AccessTokenService,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      exchangeCodeForToken: (
        shop: ShopDomain,
        code: AuthorizationCode,
        clientId: ClientId,
        clientSecret: ClientSecret
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
              })
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

      store: (
        shop: ShopDomain,
        token: AccessToken,
        scope: Scope,
        organizationSlug: OrganizationSlug
      ) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(accessTokens)
                .values({
                  shop,
                  accessToken: token,
                  scope,
                  organizationSlug: organizationSlug || null,
                  tokenType: "bearer",
                })
                .onConflictDoUpdate({
                  target: accessTokens.shop,
                  set: {
                    accessToken: token,
                    scope,
                    organizationSlug: organizationSlug || null,
                    updatedAt: new Date(),
                  },
                }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store token",
                cause: error,
              }),
          });
        }),

      retrieve: (shop: ShopDomain) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(accessTokens)
                .where(eq(accessTokens.shop, shop))
                .limit(1),
            catch: (error) =>
              new OAuthError({
                message: "Failed to retrieve token",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return null;
          }

          return result[0].accessToken as AccessToken;
        }),

      delete: (shop: ShopDomain) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(accessTokens)
                .where(eq(accessTokens.shop, shop)),
            catch: (error) =>
              new OAuthError({
                message: "Failed to delete token",
                cause: error,
              }),
          });
        }),

      retrieveWithOrganization: (shop: ShopDomain) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(accessTokens)
                .where(eq(accessTokens.shop, shop))
                .limit(1),
            catch: (error) =>
              new OAuthError({
                message: "Failed to retrieve token with organization",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return null;
          }

          return {
            accessToken: result[0].accessToken as AccessToken,
            scope: result[0].scope as Scope,
            organizationSlug: result[0].organizationSlug as OrganizationSlug,
          };
        }),
    };
  })
);
