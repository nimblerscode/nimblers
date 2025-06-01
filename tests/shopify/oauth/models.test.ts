import { describe, expect, it } from "@effect/vitest";
import { Schema as S } from "effect";
import {
  AccessToken,
  AccessTokenError,
  type AccessTokenResponse,
  AccessTokenResponseSchema,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  InvalidHmacError,
  InvalidNonceError,
  InvalidShopDomainError,
  Nonce,
  type OAuthCallbackRequest,
  OAuthCallbackRequestSchema,
  OAuthError,
  type OAuthInstallRequest,
  OAuthInstallRequestSchema,
  type OnlineAccessTokenResponse,
  OnlineAccessTokenResponseSchema,
  Scope,
  ShopDomain,
} from "../../../src/domain/shopify/oauth/models";

describe("Shopify OAuth Domain Models", () => {
  describe("Branded Types", () => {
    describe("ShopDomain", () => {
      it("should accept valid Shopify domain", () => {
        const validDomains = [
          "test-shop.myshopify.com",
          "my-store.myshopify.com",
          "store123.myshopify.com",
          "a.myshopify.com",
          "test-shop-name.myshopify.com",
        ];

        validDomains.forEach((domain) => {
          const result = S.decodeSync(ShopDomain)(domain);
          expect(result).toBe(domain);
        });
      });

      it("should reject invalid Shopify domains", () => {
        const invalidDomains = [
          "test-shop.com",
          "myshopify.com",
          ".myshopify.com",
          "test-shop.myshopify.com.evil.com",
          "test shop.myshopify.com", // space
          "test-shop.myshopify.co",
          "test-shop.shopify.com",
          "",
          "https://test-shop.myshopify.com",
          "test-shop.myshopify.com/admin",
        ];

        invalidDomains.forEach((domain) => {
          expect(() => S.decodeSync(ShopDomain)(domain)).toThrow();
        });
      });

      it("should handle edge cases", () => {
        // Hyphen at beginning should fail
        expect(() => S.decodeSync(ShopDomain)("-test.myshopify.com")).toThrow();

        // Hyphen at end before .myshopify.com should work
        const validWithHyphen = "test-shop-.myshopify.com";
        expect(() => S.decodeSync(ShopDomain)(validWithHyphen)).toThrow(); // Actually this should fail per regex

        // Number at start should work
        const numberStart = "123test.myshopify.com";
        const result = S.decodeSync(ShopDomain)(numberStart);
        expect(result).toBe(numberStart);
      });
    });

    describe("ClientId", () => {
      it("should create branded ClientId from string", () => {
        const clientId = "test_client_id_12345";
        const result = S.decodeSync(ClientId)(clientId);
        expect(result).toBe(clientId);
      });

      it("should handle empty string", () => {
        const result = S.decodeSync(ClientId)("");
        expect(result).toBe("");
      });
    });

    describe("ClientSecret", () => {
      it("should create branded ClientSecret from string", () => {
        const secret = "test_client_secret_67890_very_long_secret";
        const result = S.decodeSync(ClientSecret)(secret);
        expect(result).toBe(secret);
      });
    });

    describe("AuthorizationCode", () => {
      it("should create branded AuthorizationCode from string", () => {
        const code = "gid://shopify/OAuth/12345";
        const result = S.decodeSync(AuthorizationCode)(code);
        expect(result).toBe(code);
      });
    });

    describe("AccessToken", () => {
      it("should create branded AccessToken from string", () => {
        const token = "shpat_1234567890abcdef1234567890abcdef";
        const result = S.decodeSync(AccessToken)(token);
        expect(result).toBe(token);
      });
    });

    describe("Nonce", () => {
      it("should create branded Nonce from string", () => {
        const nonce = "abc123def456ghi789";
        const result = S.decodeSync(Nonce)(nonce);
        expect(result).toBe(nonce);
      });
    });

    describe("Scope", () => {
      it("should create branded Scope from string", () => {
        const scope = "read_products,write_products";
        const result = S.decodeSync(Scope)(scope);
        expect(result).toBe(scope);
      });
    });
  });

  describe("OAuth Request Schemas", () => {
    describe("OAuthInstallRequestSchema", () => {
      it("should parse valid install request", () => {
        const validRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "d3b5c7e8a1234567890abcdef1234567890abcdef12345678",
          embedded: "1",
        };

        const result: OAuthInstallRequest = S.decodeSync(
          OAuthInstallRequestSchema,
        )(validRequest);
        expect(result.shop).toBe(validRequest.shop);
        expect(result.timestamp).toBe(validRequest.timestamp);
        expect(result.hmac).toBe(validRequest.hmac);
        expect(result.embedded).toBe(validRequest.embedded);
      });

      it("should parse install request without embedded flag", () => {
        const validRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "d3b5c7e8a1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        };

        const result: OAuthInstallRequest = S.decodeSync(
          OAuthInstallRequestSchema,
        )(validRequest);
        expect(result.embedded).toBeUndefined();
      });

      it("should reject install request with invalid shop", () => {
        const invalidRequest = {
          shop: "invalid-shop.com",
          timestamp: "1234567890",
          hmac: "d3b5c7e8a1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        };

        expect(() =>
          S.decodeSync(OAuthInstallRequestSchema)(invalidRequest),
        ).toThrow();
      });

      it("should reject install request with missing required fields", () => {
        const incompleteRequests = [
          { shop: "test-shop.myshopify.com", timestamp: "1234567890" }, // missing hmac
          { shop: "test-shop.myshopify.com", hmac: "abc123" }, // missing timestamp
          { timestamp: "1234567890", hmac: "abc123" }, // missing shop
        ];

        incompleteRequests.forEach((request) => {
          expect(() =>
            S.decodeSync(OAuthInstallRequestSchema)(request as any),
          ).toThrow();
        });
      });
    });

    describe("OAuthCallbackRequestSchema", () => {
      it("should parse valid callback request", () => {
        const validRequest = {
          code: "gid://shopify/OAuth/12345",
          hmac: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
          shop: "test-shop.myshopify.com",
          state: "nonce_abc123",
          timestamp: "1234567890",
        };

        const result: OAuthCallbackRequest = S.decodeSync(
          OAuthCallbackRequestSchema,
        )(validRequest);
        expect(result.code).toBe(validRequest.code);
        expect(result.hmac).toBe(validRequest.hmac);
        expect(result.shop).toBe(validRequest.shop);
        expect(result.state).toBe(validRequest.state);
        expect(result.timestamp).toBe(validRequest.timestamp);
      });

      it("should reject callback request with missing required fields", () => {
        const incompleteRequests = [
          {
            hmac: "abc123",
            shop: "test-shop.myshopify.com",
            state: "nonce123",
            timestamp: "1234567890",
          }, // missing code
          {
            code: "auth123",
            shop: "test-shop.myshopify.com",
            state: "nonce123",
            timestamp: "1234567890",
          }, // missing hmac
          {
            code: "auth123",
            hmac: "abc123",
            state: "nonce123",
            timestamp: "1234567890",
          }, // missing shop
          {
            code: "auth123",
            hmac: "abc123",
            shop: "test-shop.myshopify.com",
            timestamp: "1234567890",
          }, // missing state
          {
            code: "auth123",
            hmac: "abc123",
            shop: "test-shop.myshopify.com",
            state: "nonce123",
          }, // missing timestamp
        ];

        incompleteRequests.forEach((request) => {
          expect(() =>
            S.decodeSync(OAuthCallbackRequestSchema)(request as any),
          ).toThrow();
        });
      });

      it("should reject callback request with invalid shop", () => {
        const invalidRequest = {
          code: "auth123",
          hmac: "abc123",
          shop: "invalid-shop.com",
          state: "nonce123",
          timestamp: "1234567890",
        };

        expect(() =>
          S.decodeSync(OAuthCallbackRequestSchema)(invalidRequest),
        ).toThrow();
      });
    });
  });

  describe("Response Schemas", () => {
    describe("AccessTokenResponseSchema", () => {
      it("should parse valid access token response", () => {
        const validResponse = {
          access_token: "shpat_1234567890abcdef1234567890abcdef",
          scope: "read_products,write_products",
        };

        const result: AccessTokenResponse = S.decodeSync(
          AccessTokenResponseSchema,
        )(validResponse);
        expect(result.access_token).toBe(validResponse.access_token);
        expect(result.scope).toBe(validResponse.scope);
      });

      it("should reject incomplete access token response", () => {
        const incompleteResponses = [
          { access_token: "shpat_123" }, // missing scope
          { scope: "read_products" }, // missing access_token
          {}, // missing both
        ];

        incompleteResponses.forEach((response) => {
          expect(() =>
            S.decodeSync(AccessTokenResponseSchema)(response as any),
          ).toThrow();
        });
      });
    });

    describe("OnlineAccessTokenResponseSchema", () => {
      it("should parse valid online access token response", () => {
        const validResponse = {
          access_token: "shpat_1234567890abcdef1234567890abcdef",
          scope: "read_products,write_products",
          expires_in: 3600,
          associated_user_scope: "read_customers",
          associated_user: {
            id: 12345,
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            email_verified: true,
            account_owner: true,
            locale: "en",
            collaborator: false,
          },
        };

        const result: OnlineAccessTokenResponse = S.decodeSync(
          OnlineAccessTokenResponseSchema,
        )(validResponse);
        expect(result.access_token).toBe(validResponse.access_token);
        expect(result.scope).toBe(validResponse.scope);
        expect(result.expires_in).toBe(validResponse.expires_in);
        expect(result.associated_user.id).toBe(
          validResponse.associated_user.id,
        );
        expect(result.associated_user.email).toBe(
          validResponse.associated_user.email,
        );
      });

      it("should reject incomplete online access token response", () => {
        const incompleteUser = {
          access_token: "shpat_123",
          scope: "read_products",
          expires_in: 3600,
          associated_user_scope: "read_customers",
          associated_user: {
            id: 12345,
            first_name: "John",
            // Missing required fields
          },
        };

        expect(() =>
          S.decodeSync(OnlineAccessTokenResponseSchema)(incompleteUser as any),
        ).toThrow();
      });
    });
  });

  describe("Error Types", () => {
    describe("InvalidShopDomainError", () => {
      it("should create error with message and shop", () => {
        const error = new InvalidShopDomainError({
          message: "Invalid shop domain",
          shop: "invalid-shop.com",
        });

        expect(error._tag).toBe("InvalidShopDomainError");
        expect(error.message).toBe("Invalid shop domain");
        expect(error.shop).toBe("invalid-shop.com");
      });

      it("should be serializable", () => {
        const error = new InvalidShopDomainError({
          message: "Invalid shop domain",
          shop: "invalid-shop.com",
        });

        const serialized = JSON.stringify(error);
        const parsed = JSON.parse(serialized);

        expect(parsed._tag).toBe("InvalidShopDomainError");
        expect(parsed.message).toBe("Invalid shop domain");
        expect(parsed.shop).toBe("invalid-shop.com");
      });
    });

    describe("InvalidHmacError", () => {
      it("should create error with message", () => {
        const error = new InvalidHmacError({
          message: "HMAC verification failed",
        });

        expect(error._tag).toBe("InvalidHmacError");
        expect(error.message).toBe("HMAC verification failed");
      });
    });

    describe("InvalidNonceError", () => {
      it("should create error with message", () => {
        const error = new InvalidNonceError({
          message: "Invalid nonce",
        });

        expect(error._tag).toBe("InvalidNonceError");
        expect(error.message).toBe("Invalid nonce");
      });
    });

    describe("OAuthError", () => {
      it("should create error with message", () => {
        const error = new OAuthError({
          message: "OAuth flow failed",
        });

        expect(error._tag).toBe("OAuthError");
        expect(error.message).toBe("OAuth flow failed");
        expect(error.cause).toBeUndefined();
      });

      it("should create error with message and cause", () => {
        const cause = new Error("Network error");
        const error = new OAuthError({
          message: "OAuth flow failed",
          cause,
        });

        expect(error._tag).toBe("OAuthError");
        expect(error.message).toBe("OAuth flow failed");
        expect(error.cause).toBe(cause);
      });
    });

    describe("AccessTokenError", () => {
      it("should create error with message", () => {
        const error = new AccessTokenError({
          message: "Token exchange failed",
        });

        expect(error._tag).toBe("AccessTokenError");
        expect(error.message).toBe("Token exchange failed");
      });

      it("should create error with message and cause", () => {
        const cause = new Error("API error");
        const error = new AccessTokenError({
          message: "Token exchange failed",
          cause,
        });

        expect(error.cause).toBe(cause);
      });
    });
  });

  describe("Schema Integration", () => {
    it("should decode and re-encode request data consistently", () => {
      const originalData = {
        shop: "test-shop.myshopify.com",
        timestamp: "1234567890",
        hmac: "abc123def456",
        embedded: "1",
      };

      const decoded = S.decodeSync(OAuthInstallRequestSchema)(originalData);
      const encoded = S.encodeSync(OAuthInstallRequestSchema)(decoded);

      expect(encoded).toEqual(originalData);
    });

    it("should handle type narrowing correctly", () => {
      const data = S.decodeSync(OAuthInstallRequestSchema)({
        shop: "test-shop.myshopify.com",
        timestamp: "1234567890",
        hmac: "abc123",
      });

      // TypeScript should infer these as branded types
      const shop: string = data.shop; // ShopDomain should be assignable to string
      expect(shop).toBe("test-shop.myshopify.com");
    });
  });
});
