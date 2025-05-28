import { Effect, Layer } from "effect";
import { ShopifyHmacVerifier } from "@/domain/global/shopify/compliance/service";
import { InvalidHmacError } from "@/domain/global/shopify/compliance/models";

export const ShopifyHmacVerifierLive = Layer.effect(
  ShopifyHmacVerifier,
  Effect.gen(function* () {
    return {
      verify: (request: Request, secret: string) =>
        Effect.gen(function* () {
          if (!request) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Request parameter is undefined",
              })
            );
          }

          if (!request.headers) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Request headers are undefined",
              })
            );
          }

          const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");

          if (!hmacHeader) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Missing X-Shopify-Hmac-Sha256 header",
              })
            );
          }

          // Clone the request to read the body without consuming it
          const clonedRequest = request.clone();
          const body = yield* Effect.tryPromise({
            try: () => clonedRequest.text(),
            catch: (error) =>
              new InvalidHmacError({
                message: "Failed to read request body",
              }),
          });

          // Create HMAC using Web Crypto API
          const encoder = new TextEncoder();
          const key = yield* Effect.tryPromise({
            try: () =>
              crypto.subtle.importKey(
                "raw",
                encoder.encode(secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
              ),
            catch: (error) =>
              new InvalidHmacError({
                message: "Failed to import HMAC key",
              }),
          });

          const signature = yield* Effect.tryPromise({
            try: () => crypto.subtle.sign("HMAC", key, encoder.encode(body)),
            catch: (error) =>
              new InvalidHmacError({
                message: "Failed to compute HMAC signature",
              }),
          });

          const expectedHmac = btoa(
            String.fromCharCode(...new Uint8Array(signature))
          );

          // Constant-time comparison
          return hmacHeader === expectedHmac;
        }).pipe(Effect.withSpan("ShopifyHmacVerifier.verify")),
    };
  })
);
