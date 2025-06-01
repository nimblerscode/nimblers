import { Effect, Layer } from "effect";
import {
  type ShopifyWebhookHeaders,
  WebhookVerificationError,
} from "@/domain/shopify/webhooks/models";
import { ShopifyWebhookVerifier } from "@/domain/shopify/webhooks/service";

export const ShopifyWebhookVerifierLive = Layer.succeed(
  ShopifyWebhookVerifier,
  {
    verifyWebhook: (
      body: string,
      headers: ShopifyWebhookHeaders,
      secret: string,
    ) =>
      Effect.gen(function* () {
        const hmacHeader = headers["X-Shopify-Hmac-Sha256"];

        if (!hmacHeader) {
          return yield* Effect.fail(
            new WebhookVerificationError({
              message: "Missing HMAC header",
            }),
          );
        }

        // Validate secret
        if (!secret || secret.trim() === "") {
          return yield* Effect.fail(
            new WebhookVerificationError({
              message: "Webhook secret is empty or undefined",
            }),
          );
        }

        // Calculate HMAC using Web Crypto API
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(body);

        const cryptoKey = yield* Effect.tryPromise({
          try: () =>
            crypto.subtle.importKey(
              "raw",
              keyData,
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"],
            ),
          catch: (error) =>
            new WebhookVerificationError({
              message: "Failed to import crypto key",
              cause: error,
            }),
        });

        const signature = yield* Effect.tryPromise({
          try: () => crypto.subtle.sign("HMAC", cryptoKey, messageData),
          catch: (error) =>
            new WebhookVerificationError({
              message: "Failed to calculate HMAC",
              cause: error,
            }),
        });

        // Convert to base64 for comparison
        const calculatedHmac = btoa(
          String.fromCharCode(...new Uint8Array(signature)),
        );

        // Compare with provided HMAC (remove any whitespace)
        const providedHmac = hmacHeader.trim();
        const isValid = calculatedHmac === providedHmac;

        // Add debug logging for HMAC comparison
        yield* Effect.log("🔐 HMAC Comparison Debug", {
          providedHmac,
          calculatedHmac,
          secretLength: secret.length,
          bodyLength: body.length,
          bodyPreview: body.substring(0, 100),
          headerKeys: Object.keys(headers),
          isValid,
        });

        if (!isValid) {
          return yield* Effect.fail(
            new WebhookVerificationError({
              message: "HMAC verification failed",
            }),
          );
        }

        return true;
      }),
  },
);
