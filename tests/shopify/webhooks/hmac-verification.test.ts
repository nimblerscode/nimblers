import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { ShopifyWebhookVerifier } from "../../../src/domain/shopify/webhooks/service";
import type { ShopifyWebhookHeaders } from "../../../src/domain/shopify/webhooks/models";
import { ShopifyWebhookVerifierLive } from "../../../src/infrastructure/shopify/webhooks/verifier";
import { WebhookVerificationError } from "../../../src/domain/shopify/webhooks/models";

describe("Shopify Webhook HMAC Verification", () => {
  const testSecret = "test-webhook-secret";
  const testPayload = JSON.stringify({
    id: 12345,
    name: "Test Shop",
    domain: "test-shop.myshopify.com",
  });

  // Helper function to create a valid HMAC signature
  const createValidHmac = async (
    payload: string,
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
      encoder.encode(payload)
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  };

  it.scoped("should verify valid HMAC signature with proper case headers", () =>
    Effect.gen(function* () {
      const webhookVerifier = yield* ShopifyWebhookVerifier;
      const validHmac = yield* Effect.promise(() =>
        createValidHmac(testPayload, testSecret)
      );

      const headers: ShopifyWebhookHeaders = {
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": validHmac,
        "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
        "X-Shopify-Webhook-Id": "webhook-123",
      };

      const result = yield* webhookVerifier.verifyWebhook(
        testPayload,
        headers,
        testSecret
      );

      expect(result).toBe(true);
    }).pipe(Effect.provide(ShopifyWebhookVerifierLive))
  );

  it.scoped("should reject request without HMAC header", () =>
    Effect.gen(function* () {
      const webhookVerifier = yield* ShopifyWebhookVerifier;

      const headers = {
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
        "X-Shopify-Webhook-Id": "webhook-123",
        // Missing X-Shopify-Hmac-Sha256
      } as any;

      const result = yield* Effect.either(
        webhookVerifier.verifyWebhook(testPayload, headers, testSecret)
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left as WebhookVerificationError;
        expect(error.message).toContain("Missing HMAC header");
      }
    }).pipe(Effect.provide(ShopifyWebhookVerifierLive))
  );

  it.scoped("should reject invalid HMAC signature", () =>
    Effect.gen(function* () {
      const webhookVerifier = yield* ShopifyWebhookVerifier;

      const headers: ShopifyWebhookHeaders = {
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": "invalid-hmac-signature",
        "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
        "X-Shopify-Webhook-Id": "webhook-123",
      };

      const result = yield* Effect.either(
        webhookVerifier.verifyWebhook(testPayload, headers, testSecret)
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left as WebhookVerificationError;
        expect(error.message).toContain("HMAC verification failed");
      }
    }).pipe(Effect.provide(ShopifyWebhookVerifierLive))
  );

  it.scoped("should reject when payload is modified", () =>
    Effect.gen(function* () {
      const webhookVerifier = yield* ShopifyWebhookVerifier;
      const validHmac = yield* Effect.promise(() =>
        createValidHmac(testPayload, testSecret)
      );

      const headers: ShopifyWebhookHeaders = {
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": validHmac,
        "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
        "X-Shopify-Webhook-Id": "webhook-123",
      };

      const modifiedPayload = testPayload + " modified";

      const result = yield* Effect.either(
        webhookVerifier.verifyWebhook(modifiedPayload, headers, testSecret)
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left as WebhookVerificationError;
        expect(error.message).toContain("HMAC verification failed");
      }
    }).pipe(Effect.provide(ShopifyWebhookVerifierLive))
  );

  it.scoped("should reject empty webhook secret", () =>
    Effect.gen(function* () {
      const webhookVerifier = yield* ShopifyWebhookVerifier;

      const headers: ShopifyWebhookHeaders = {
        "X-Shopify-Topic": "app/uninstalled",
        "X-Shopify-Hmac-Sha256": "some-hmac",
        "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
        "X-Shopify-Webhook-Id": "webhook-123",
      };

      const result = yield* Effect.either(
        webhookVerifier.verifyWebhook(testPayload, headers, "")
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left as WebhookVerificationError;
        expect(error.message).toContain("Webhook secret is empty");
      }
    }).pipe(Effect.provide(ShopifyWebhookVerifierLive))
  );
});
