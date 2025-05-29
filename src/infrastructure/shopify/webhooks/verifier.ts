import { Effect, Layer } from "effect";
import {
  type ShopifyWebhookHeaders,
  WebhookVerificationError,
} from "@/domain/global/shopify/webhooks/models";
import { ShopifyWebhookVerifier } from "@/domain/global/shopify/webhooks/service";

export const ShopifyWebhookVerifierLive = Layer.succeed(
  ShopifyWebhookVerifier,
  {
    verifyWebhook: (
      body: string,
      headers: ShopifyWebhookHeaders,
      secret: string,
    ) =>
      Effect.gen(function* () {
        const hmacHeader = headers["x-shopify-hmac-sha256"];

        if (!hmacHeader) {
          return yield* Effect.fail(
            new WebhookVerificationError({
              message: "Missing HMAC header",
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

        // Compare with provided HMAC
        const providedHmac = hmacHeader;
        const isValid = calculatedHmac === providedHmac;

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
