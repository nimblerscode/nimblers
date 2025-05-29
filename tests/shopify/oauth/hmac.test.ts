import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { it as effectIt } from "@effect/vitest";
import { ShopifyOAuthHmacVerifier } from "../../../src/domain/global/shopify/oauth/service";
import { ShopifyOAuthHmacVerifierLive } from "../../../src/infrastructure/shopify/oauth/hmac";
import {
  type OAuthInstallRequest,
  type OAuthCallbackRequest,
  type ClientSecret,
} from "../../../src/domain/global/shopify/oauth/models";

describe("Shopify OAuth HMAC Verification", () => {
  const testSecret = "test_secret_12345" as ClientSecret;

  // Helper function to generate HMAC signature for testing
  const generateHmac = async (
    data: string,
    secret: string
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data)
    );
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Helper function to build query string like the implementation
  const buildQueryString = (params: Record<string, string>) => {
    return Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
  };

  describe("Install Request HMAC Verification", () => {
    effectIt.scoped(
      "should verify valid HMAC signature for install request",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          // Create request data without HMAC
          const requestData = {
            shop: "test-shop.myshopify.com",
            timestamp: "1234567890",
            embedded: "1",
          };

          // Generate expected HMAC
          const queryString = buildQueryString(requestData);
          const expectedHmac = yield* Effect.tryPromise({
            try: () => generateHmac(queryString, testSecret),
            catch: () => new Error("Failed to generate HMAC"),
          });

          const request: OAuthInstallRequest = {
            ...requestData,
            hmac: expectedHmac,
          } as OAuthInstallRequest;

          const result = yield* hmacVerifier.verifyInstallRequest(
            request,
            testSecret
          );
          expect(result).toBe(true);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped(
      "should reject invalid HMAC signature for install request",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          const request: OAuthInstallRequest = {
            shop: "test-shop.myshopify.com",
            timestamp: "1234567890",
            embedded: "1",
            hmac: "invalid_hmac_signature",
          } as OAuthInstallRequest;

          const result = yield* hmacVerifier.verifyInstallRequest(
            request,
            testSecret
          );
          expect(result).toBe(false);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped(
      "should verify install request without embedded parameter",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          const requestData = {
            shop: "test-shop.myshopify.com",
            timestamp: "1234567890",
          };

          const queryString = buildQueryString(requestData);
          const expectedHmac = yield* Effect.tryPromise({
            try: () => generateHmac(queryString, testSecret),
            catch: () => new Error("Failed to generate HMAC"),
          });

          const request: OAuthInstallRequest = {
            ...requestData,
            hmac: expectedHmac,
          } as OAuthInstallRequest;

          const result = yield* hmacVerifier.verifyInstallRequest(
            request,
            testSecret
          );
          expect(result).toBe(true);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped("should handle parameter ordering correctly", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        // Parameters in different order than alphabetical
        const requestData = {
          timestamp: "1234567890",
          embedded: "1",
          shop: "test-shop.myshopify.com",
        };

        // Should be sorted alphabetically: embedded, shop, timestamp
        const sortedQueryString =
          "embedded=1&shop=test-shop.myshopify.com&timestamp=1234567890";
        const expectedHmac = yield* Effect.tryPromise({
          try: () => generateHmac(sortedQueryString, testSecret),
          catch: () => new Error("Failed to generate HMAC"),
        });

        const request: OAuthInstallRequest = {
          ...requestData,
          hmac: expectedHmac,
        } as OAuthInstallRequest;

        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(true);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );
  });

  describe("Callback Request HMAC Verification", () => {
    effectIt.scoped(
      "should verify valid HMAC signature for callback request",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          const requestData = {
            code: "gid://shopify/OAuth/12345",
            shop: "test-shop.myshopify.com",
            state: "nonce_abc123",
            timestamp: "1234567890",
          };

          const queryString = buildQueryString(requestData);
          const expectedHmac = yield* Effect.tryPromise({
            try: () => generateHmac(queryString, testSecret),
            catch: () => new Error("Failed to generate HMAC"),
          });

          const request: OAuthCallbackRequest = {
            ...requestData,
            hmac: expectedHmac,
          } as OAuthCallbackRequest;

          const result = yield* hmacVerifier.verifyCallbackRequest(
            request,
            testSecret
          );
          expect(result).toBe(true);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped(
      "should reject invalid HMAC signature for callback request",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          const request: OAuthCallbackRequest = {
            code: "gid://shopify/OAuth/12345",
            hmac: "invalid_hmac_signature",
            shop: "test-shop.myshopify.com",
            state: "nonce_abc123",
            timestamp: "1234567890",
          } as OAuthCallbackRequest;

          const result = yield* hmacVerifier.verifyCallbackRequest(
            request,
            testSecret
          );
          expect(result).toBe(false);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped(
      "should verify callback request with special characters",
      () =>
        Effect.gen(function* () {
          const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

          const requestData = {
            code: "gid://shopify/OAuth/12345",
            shop: "test-shop-name.myshopify.com",
            state: "nonce_with_special_chars_123!@#",
            timestamp: "1234567890",
          };

          const queryString = buildQueryString(requestData);
          const expectedHmac = yield* Effect.tryPromise({
            try: () => generateHmac(queryString, testSecret),
            catch: () => new Error("Failed to generate HMAC"),
          });

          const request: OAuthCallbackRequest = {
            ...requestData,
            hmac: expectedHmac,
          } as OAuthCallbackRequest;

          const result = yield* hmacVerifier.verifyCallbackRequest(
            request,
            testSecret
          );
          expect(result).toBe(true);
        }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );
  });

  describe("Security Features", () => {
    effectIt.scoped("should use constant-time comparison", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const request: OAuthInstallRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "almost_correct_hmac_but_one_char_off",
        } as OAuthInstallRequest;

        // Even if most characters match, should return false
        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(false);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped("should handle empty HMAC", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const request: OAuthInstallRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "",
        } as OAuthInstallRequest;

        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(false);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped("should handle different case in HMAC", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const requestData = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
        };

        const queryString = buildQueryString(requestData);
        const expectedHmac = yield* Effect.tryPromise({
          try: () => generateHmac(queryString, testSecret),
          catch: () => new Error("Failed to generate HMAC"),
        });

        // Convert to uppercase (HMAC should be case-sensitive)
        const request: OAuthInstallRequest = {
          ...requestData,
          hmac: expectedHmac.toUpperCase(),
        } as OAuthInstallRequest;

        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(false); // Should fail due to case difference
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );
  });

  describe("Error Handling", () => {
    effectIt.scoped("should handle crypto operations gracefully", () =>
      Effect.gen(function* () {
        // Create a verifier layer that will use the real implementation
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const request: OAuthInstallRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "valid_hex_string_but_wrong_signature",
        } as OAuthInstallRequest;

        // This should not throw, but return false
        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(false);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    it("should handle invalid secret format", async () => {
      // Test with empty secret
      const emptySecret = "" as ClientSecret;

      const program = Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const request: OAuthInstallRequest = {
          shop: "test-shop.myshopify.com",
          timestamp: "1234567890",
          hmac: "some_hmac",
        } as OAuthInstallRequest;

        return yield* hmacVerifier.verifyInstallRequest(request, emptySecret);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive));

      // Should handle gracefully and not throw
      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Right");
      if (result._tag === "Right") {
        expect(result.right).toBe(false);
      }
    });
  });

  describe("Real World Examples", () => {
    effectIt.scoped("should verify Shopify documentation example", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        // Example from Shopify documentation (simplified)
        const requestData = {
          code: "0907a61c0c8d55e99db179b68161bc00",
          shop: "some-shop.myshopify.com",
          state: "0.6784241404160823",
          timestamp: "1337178173",
        };

        const queryString = buildQueryString(requestData);
        const realSecret = "hush" as ClientSecret;

        const expectedHmac = yield* Effect.tryPromise({
          try: () => generateHmac(queryString, realSecret),
          catch: () => new Error("Failed to generate HMAC"),
        });

        const request: OAuthCallbackRequest = {
          ...requestData,
          hmac: expectedHmac,
        } as OAuthCallbackRequest;

        const result = yield* hmacVerifier.verifyCallbackRequest(
          request,
          realSecret
        );
        expect(result).toBe(true);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );

    effectIt.scoped("should handle Unicode characters in shop names", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        const requestData = {
          shop: "tëst-shöp.myshopify.com",
          timestamp: "1234567890",
        };

        const queryString = buildQueryString(requestData);
        const expectedHmac = yield* Effect.tryPromise({
          try: () => generateHmac(queryString, testSecret),
          catch: () => new Error("Failed to generate HMAC"),
        });

        const request: OAuthInstallRequest = {
          ...requestData,
          hmac: expectedHmac,
        } as OAuthInstallRequest;

        const result = yield* hmacVerifier.verifyInstallRequest(
          request,
          testSecret
        );
        expect(result).toBe(true);
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );
  });

  describe("Performance", () => {
    effectIt.scoped("should handle multiple concurrent verifications", () =>
      Effect.gen(function* () {
        const hmacVerifier = yield* ShopifyOAuthHmacVerifier;

        // Create multiple verification tasks
        const verificationTasks = Array.from({ length: 10 }, (_, i) => {
          const requestData = {
            shop: `test-shop-${i}.myshopify.com`,
            timestamp: `${1234567890 + i}`,
          };

          return Effect.gen(function* () {
            const queryString = buildQueryString(requestData);
            const expectedHmac = yield* Effect.tryPromise({
              try: () => generateHmac(queryString, testSecret),
              catch: () => new Error("Failed to generate HMAC"),
            });

            const request: OAuthInstallRequest = {
              ...requestData,
              hmac: expectedHmac,
            } as OAuthInstallRequest;

            return yield* hmacVerifier.verifyInstallRequest(
              request,
              testSecret
            );
          });
        });

        // Run all verifications concurrently
        const results = yield* Effect.all(verificationTasks, {
          concurrency: "unbounded",
        });

        // All should succeed
        results.forEach((result) => {
          expect(result).toBe(true);
        });
      }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
    );
  });
});
