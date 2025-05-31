import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import type {
  AccessToken,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  Nonce,
  Scope,
  ShopDomain,
} from "../../../src/domain/shopify/oauth/models";
import type { OrganizationId } from "../../../src/domain/global/organization/models";
import { ShopifyOAuthApiSchemas } from "../../../src/infrastructure/cloudflare/durable-objects/shopify/oauth/api/schemas";

describe("Shopify OAuth API Schema Integration", () => {
  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testAccessToken = "shpat_test_token_12345" as AccessToken;
  const testScope = "read_products,write_products" as Scope;
  const testCode = "valid_auth_code" as AuthorizationCode;
  const testClientId = "test_client_id" as ClientId;
  const testClientSecret = "test_client_secret" as ClientSecret;
  const testNonce = "test_nonce_12345" as Nonce;
  const testOrganizationId = "org_12345" as OrganizationId;

  describe("Schema Validation", () => {
    describe("Nonce Schemas", () => {
      it.scoped("should validate nonce request schema", () =>
        Effect.gen(function* () {
          const validRequest = {
            organizationId: testOrganizationId,
            nonce: testNonce,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeNonce.request)(
              validRequest
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.nonce).toBe(testNonce);
            expect(result.right.organizationId).toBe(testOrganizationId);
          }
        })
      );

      it.scoped("should reject invalid nonce request", () =>
        Effect.gen(function* () {
          const invalidRequest = { invalidField: "not_a_nonce" };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeNonce.request)(
              invalidRequest
            )
          );

          expect(result._tag).toBe("Left");
        })
      );

      it.scoped("should validate nonce generate response schema", () =>
        Effect.gen(function* () {
          const validResponse = { nonce: "generated_nonce_123" };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.generateNonce.response)(
              validResponse
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.nonce).toBe("generated_nonce_123");
          }
        })
      );

      it.scoped("should validate nonce verify response schema", () =>
        Effect.gen(function* () {
          const validResponse = { valid: true };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.verifyNonce.response)(
              validResponse
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.valid).toBe(true);
          }
        })
      );
    });

    describe("Token Schemas", () => {
      it.scoped("should validate token store request schema", () =>
        Effect.gen(function* () {
          const validRequest = {
            organizationId: testOrganizationId,
            shop: testShop,
            accessToken: testAccessToken,
            scope: testScope,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeToken.request)(
              validRequest
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.organizationId).toBe(testOrganizationId);
            expect(result.right.shop).toBe(testShop);
            expect(result.right.accessToken).toBe(testAccessToken);
            expect(result.right.scope).toBe(testScope);
          }
        })
      );

      it.scoped("should reject incomplete token store request", () =>
        Effect.gen(function* () {
          const invalidRequest = {
            shop: testShop,
            // Missing organizationId, accessToken and scope
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeToken.request)(
              invalidRequest
            )
          );

          expect(result._tag).toBe("Left");
        })
      );

      it.scoped("should validate token retrieve response schema", () =>
        Effect.gen(function* () {
          const validResponse = {
            accessToken: testAccessToken,
            scope: testScope,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.retrieveToken.response)(
              validResponse
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.accessToken).toBe(testAccessToken);
            expect(result.right.scope).toBe(testScope);
          }
        })
      );

      it.scoped("should validate token retrieve response with null token", () =>
        Effect.gen(function* () {
          const validResponse = {
            accessToken: null,
            scope: undefined,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.retrieveToken.response)(
              validResponse
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.accessToken).toBe(null);
            expect(result.right.scope).toBeUndefined();
          }
        })
      );

      it.scoped("should validate token delete request schema", () =>
        Effect.gen(function* () {
          const validRequest = {
            organizationId: testOrganizationId,
            shop: testShop,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.deleteToken.request)(
              validRequest
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.organizationId).toBe(testOrganizationId);
            expect(result.right.shop).toBe(testShop);
          }
        })
      );

      it.scoped("should validate token delete response schema", () =>
        Effect.gen(function* () {
          const validResponse = { success: true, deleted: true };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.deleteToken.response)(
              validResponse
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.success).toBe(true);
            expect(result.right.deleted).toBe(true);
          }
        })
      );

      it.scoped("should validate token exchange request schema", () =>
        Effect.gen(function* () {
          const validRequest = {
            shop: testShop,
            code: testCode,
            clientId: testClientId,
            clientSecret: testClientSecret,
          };

          const result = yield* Effect.either(
            Schema.decodeUnknown(ShopifyOAuthApiSchemas.exchangeToken.request)(
              validRequest
            )
          );

          expect(result._tag).toBe("Right");
          if (result._tag === "Right") {
            expect(result.right.shop).toBe(testShop);
            expect(result.right.code).toBe(testCode);
            expect(result.right.clientId).toBe(testClientId);
            expect(result.right.clientSecret).toBe(testClientSecret);
          }
        })
      );
    });
  });

  describe("Schema Structure", () => {
    it("should have all required nonce operations", () => {
      expect(ShopifyOAuthApiSchemas.generateNonce).toBeDefined();
      expect(ShopifyOAuthApiSchemas.storeNonce).toBeDefined();
      expect(ShopifyOAuthApiSchemas.verifyNonce).toBeDefined();
      expect(ShopifyOAuthApiSchemas.consumeNonce).toBeDefined();

      expect(ShopifyOAuthApiSchemas.generateNonce.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.storeNonce.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.storeNonce.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.verifyNonce.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.verifyNonce.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.consumeNonce.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.consumeNonce.response).toBeDefined();
    });

    it("should have all required token operations", () => {
      expect(ShopifyOAuthApiSchemas.storeToken).toBeDefined();
      expect(ShopifyOAuthApiSchemas.retrieveToken).toBeDefined();
      expect(ShopifyOAuthApiSchemas.deleteToken).toBeDefined();
      expect(ShopifyOAuthApiSchemas.exchangeToken).toBeDefined();

      expect(ShopifyOAuthApiSchemas.storeToken.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.storeToken.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.retrieveToken.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.deleteToken.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.deleteToken.response).toBeDefined();
      expect(ShopifyOAuthApiSchemas.exchangeToken.request).toBeDefined();
      expect(ShopifyOAuthApiSchemas.exchangeToken.response).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should enforce type safety on nonce operations", () => {
      // These tests verify that the TypeScript types are working correctly
      const nonceRequest: typeof ShopifyOAuthApiSchemas.storeNonce.request =
        ShopifyOAuthApiSchemas.storeNonce.request;

      expect(nonceRequest).toBeDefined();
    });

    it("should enforce type safety on token operations", () => {
      const tokenStoreRequest: typeof ShopifyOAuthApiSchemas.storeToken.request =
        ShopifyOAuthApiSchemas.storeToken.request;

      const tokenRetrieveResponse: typeof ShopifyOAuthApiSchemas.retrieveToken.response =
        ShopifyOAuthApiSchemas.retrieveToken.response;

      expect(tokenStoreRequest).toBeDefined();
      expect(tokenRetrieveResponse).toBeDefined();
    });
  });

  describe("OAuth Flow Simulation", () => {
    it.scoped("should validate complete OAuth flow data structures", () =>
      Effect.gen(function* () {
        // 1. Generate nonce response
        const nonceGenerated = { nonce: "flow_nonce_123" };
        const nonceGenerateResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.generateNonce.response)(
            nonceGenerated
          )
        );
        expect(nonceGenerateResult._tag).toBe("Right");

        // 2. Store nonce request
        const nonceStoreRequest = {
          organizationId: testOrganizationId,
          nonce: "flow_nonce_123" as Nonce,
        };
        const nonceStoreResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeNonce.request)(
            nonceStoreRequest
          )
        );
        expect(nonceStoreResult._tag).toBe("Right");

        // 3. Verify nonce request/response
        const nonceVerifyRequest = {
          organizationId: testOrganizationId,
          nonce: "flow_nonce_123" as Nonce,
        };
        const nonceVerifyResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.verifyNonce.request)(
            nonceVerifyRequest
          )
        );
        expect(nonceVerifyResult._tag).toBe("Right");

        const nonceVerifyResponse = { valid: true };
        const nonceVerifyResponseResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.verifyNonce.response)(
            nonceVerifyResponse
          )
        );
        expect(nonceVerifyResponseResult._tag).toBe("Right");

        // 4. Exchange code for token
        const tokenExchangeRequest = {
          shop: testShop,
          code: testCode,
          clientId: testClientId,
          clientSecret: testClientSecret,
        };
        const tokenExchangeResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.exchangeToken.request)(
            tokenExchangeRequest
          )
        );
        expect(tokenExchangeResult._tag).toBe("Right");

        // 5. Store access token
        const tokenStoreRequest = {
          organizationId: testOrganizationId,
          shop: testShop,
          accessToken: testAccessToken,
          scope: testScope,
        };
        const tokenStoreResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.storeToken.request)(
            tokenStoreRequest
          )
        );
        expect(tokenStoreResult._tag).toBe("Right");

        // 6. Retrieve access token
        const tokenRetrieveResponse = {
          accessToken: testAccessToken,
          scope: testScope,
        };
        const tokenRetrieveResult = yield* Effect.either(
          Schema.decodeUnknown(ShopifyOAuthApiSchemas.retrieveToken.response)(
            tokenRetrieveResponse
          )
        );
        expect(tokenRetrieveResult._tag).toBe("Right");
      })
    );
  });
});
