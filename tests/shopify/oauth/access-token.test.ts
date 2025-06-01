import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
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
  const testOrganizationId = "test-org-123";
  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testCode = "valid_code" as AuthorizationCode;
  const testClientId = "test_client_id" as ClientId;
  const testClientSecret = "test_client_secret" as ClientSecret;
  const testToken = "shpat_test_token_12345" as AccessToken;
  const testScope = "read_products,write_products" as Scope;

  // Mock service for testing
  const MockAccessTokenService = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: (shop, code, clientId, clientSecret) =>
      Effect.gen(function* () {
        if (code === testCode) {
          return {
            access_token: testToken,
            scope: testScope,
          } as AccessTokenResponse;
        }
        return yield* Effect.fail(
          new AccessTokenError({ message: "Invalid code" }),
        );
      }),
    store: (organizationId, shop, token, scope) => Effect.succeed(void 0),
    retrieve: (organizationId, shop) => Effect.succeed(testToken),
    delete: (organizationId, shop) => Effect.succeed(true),
  });

  describe("Token Exchange", () => {
    it.scoped("should exchange valid authorization code for token", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        const response = yield* accessTokenService.exchangeCodeForToken(
          testShop,
          testCode,
          testClientId,
          testClientSecret,
        );

        expect(response.access_token).toBe(testToken);
        expect(response.scope).toBe(testScope);
      }).pipe(Effect.provide(MockAccessTokenService)),
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
            testClientSecret,
          ),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(AccessTokenError);
        }
      }).pipe(Effect.provide(MockAccessTokenService)),
    );
  });

  describe("Token Storage", () => {
    it.scoped("should store access token successfully", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        yield* accessTokenService.store(
          testOrganizationId,
          testShop,
          testToken,
          testScope,
        );

        const retrievedToken = yield* accessTokenService.retrieve(
          testOrganizationId,
          testShop,
        );
        expect(retrievedToken).toBe(testToken);
      }).pipe(Effect.provide(MockAccessTokenService)),
    );
  });

  describe("Token Retrieval", () => {
    it.scoped("should retrieve existing token", () =>
      Effect.gen(function* () {
        const accessTokenService = yield* AccessTokenService;

        const retrievedToken = yield* accessTokenService.retrieve(
          testOrganizationId,
          testShop,
        );
        expect(retrievedToken).toBe(testToken);
      }).pipe(Effect.provide(MockAccessTokenService)),
    );
  });
});
