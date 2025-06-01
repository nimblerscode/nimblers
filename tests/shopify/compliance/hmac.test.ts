import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { InvalidHmacError } from "../../../src/domain/shopify/compliance/models";
import { ShopifyHmacVerifier } from "../../../src/domain/shopify/compliance/service";
import { ShopifyHmacVerifierLive } from "../../../src/infrastructure/shopify/compliance/hmac";

describe("ShopifyHmacVerifier", () => {
  const testSecret = "test-webhook-secret";
  const testPayload = JSON.stringify({
    shop_id: 12345,
    customer: { id: 67890 },
  });

  // Create a valid HMAC signature for testing
  const createValidHmac = async (
    payload: string,
    secret: string,
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  };

  const createMockRequest = (payload: string, hmac?: string): Request => {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (hmac) {
      headers.set("X-Shopify-Hmac-Sha256", hmac);
    }

    return new Request("https://example.com/webhook", {
      method: "POST",
      headers,
      body: payload,
    });
  };

  it.scoped("should verify valid HMAC signature", () =>
    Effect.gen(function* () {
      const hmacVerifier = yield* ShopifyHmacVerifier;
      const validHmac = yield* Effect.promise(() =>
        createValidHmac(testPayload, testSecret),
      );
      const request = createMockRequest(testPayload, validHmac);

      const result = yield* hmacVerifier.verify(request, testSecret);

      expect(result).toBe(true);
    }).pipe(Effect.provide(ShopifyHmacVerifierLive)),
  );

  it.scoped("should reject request without HMAC header", () =>
    Effect.gen(function* () {
      const hmacVerifier = yield* ShopifyHmacVerifier;
      const request = createMockRequest(testPayload); // No HMAC header

      const result = yield* Effect.either(
        hmacVerifier.verify(request, testSecret),
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left as InvalidHmacError;
        expect(error).toBeInstanceOf(InvalidHmacError);
        expect(error._tag).toBe("InvalidHmacError");
        expect(error.message).toContain("Missing X-Shopify-Hmac-Sha256 header");
      }
    }).pipe(Effect.provide(ShopifyHmacVerifierLive)),
  );

  it.scoped("should reject invalid HMAC signature", () =>
    Effect.gen(function* () {
      const hmacVerifier = yield* ShopifyHmacVerifier;
      const invalidHmac = "invalid-hmac-signature";
      const request = createMockRequest(testPayload, invalidHmac);

      const result = yield* hmacVerifier.verify(request, testSecret);

      expect(result).toBe(false);
    }).pipe(Effect.provide(ShopifyHmacVerifierLive)),
  );

  it.scoped("should reject when payload is modified", () =>
    Effect.gen(function* () {
      const hmacVerifier = yield* ShopifyHmacVerifier;
      const validHmac = yield* Effect.promise(() =>
        createValidHmac(testPayload, testSecret),
      );
      const modifiedPayload = testPayload + " modified";
      const request = createMockRequest(modifiedPayload, validHmac);

      const result = yield* hmacVerifier.verify(request, testSecret);

      expect(result).toBe(false);
    }).pipe(Effect.provide(ShopifyHmacVerifierLive)),
  );

  it.scoped("should reject when secret is different", () =>
    Effect.gen(function* () {
      const hmacVerifier = yield* ShopifyHmacVerifier;
      const validHmac = yield* Effect.promise(() =>
        createValidHmac(testPayload, testSecret),
      );
      const request = createMockRequest(testPayload, validHmac);
      const differentSecret = "different-secret";

      const result = yield* hmacVerifier.verify(request, differentSecret);

      expect(result).toBe(false);
    }).pipe(Effect.provide(ShopifyHmacVerifierLive)),
  );
});
