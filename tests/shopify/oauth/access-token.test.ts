import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import type { OrganizationSlug } from "../../../src/domain/global/organization/models";
import {
  type AccessToken,
  AccessTokenError,
  type AccessTokenResponse,
  type AuthorizationCode,
  type ClientId,
  type ClientSecret,
  type Scope,
  type ShopDomain,
} from "../../../src/domain/shopify/oauth/models";
import { AccessTokenService } from "../../../src/domain/shopify/oauth/service";

describe("Shopify OAuth Access Token Service", () => {
  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testCode = "valid_code" as AuthorizationCode;
  const testClientId = "test_client_id" as ClientId;
  const testClientSecret = "test_client_secret" as ClientSecret;
  const testToken = "shpat_test_token_12345" as AccessToken;
  const testScope = "read_products,write_products" as Scope;
  const testOrganizationSlug = "test-org-123" as OrganizationSlug;

  // Mock service for testing
  const MockAccessTokenService = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: (_shop, code, _clientId, _clientSecret) =>
      Effect.gen(function* () {
        if (code === testCode) {
          return {
            access_token: testToken,
            scope: testScope,
          } as AccessTokenResponse;
        }
        return yield* Effect.fail(
          new AccessTokenError({ message: "Invalid code" })
        );
      }),
    store: (_shop, _token, _scope, _organizationSlug) => Effect.succeed(void 0),
    retrieve: (_shop) => Effect.succeed(testToken),
    retrieveWithOrganization: (_shop) =>
      Effect.succeed({
        accessToken: testToken,
        scope: testScope,
        organizationSlug: testOrganizationSlug,
      }),
    delete: (_shop) => Effect.succeed(void 0),
  });

  describe("Token Exchange", () => {
    it.scoped("should exchange valid authorization code for token", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        const response = yield* accessTokenService.exchangeCodeForToken(
          testShop,
          testCode,
          testClientId,
          testClientSecret
        );

        expect(response.access_token).toBe(testToken);
        expect(response.scope).toBe(testScope);
      }).pipe(Effect.provide(MockAccessTokenService))
    );

    it.scoped("should reject invalid authorization code", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        const invalidCode = "invalid_code" as AuthorizationCode;

        const result = yield* Effect.either(
          accessTokenService.exchangeCodeForToken(
            testShop,
            invalidCode,
            testClientId,
            testClientSecret
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(AccessTokenError);
        }
      }).pipe(Effect.provide(MockAccessTokenService))
    );
  });

  describe("Token Storage", () => {
    it.scoped("should store access token successfully", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        yield* accessTokenService.store(
          testShop,
          testToken,
          testScope,
          testOrganizationSlug
        );

        const retrievedToken = yield* accessTokenService.retrieve(testShop);
        expect(retrievedToken).toBe(testToken);
      }).pipe(Effect.provide(MockAccessTokenService))
    );
  });

  describe("Token Retrieval", () => {
    it.scoped("should retrieve existing token", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        const retrievedToken = yield* accessTokenService.retrieve(testShop);
        expect(retrievedToken).toBe(testToken);
      }).pipe(Effect.provide(MockAccessTokenService))
    );
  });
});
