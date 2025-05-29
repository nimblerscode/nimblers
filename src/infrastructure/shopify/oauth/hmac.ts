import { Effect, Layer } from "effect";
import type {
  ClientSecret,
  OAuthCallbackRequest,
  OAuthInstallRequest,
} from "@/domain/global/shopify/oauth/models";
import { ShopifyOAuthHmacVerifier } from "@/domain/global/shopify/oauth/service";

export const ShopifyOAuthHmacVerifierLive = Layer.effect(
  ShopifyOAuthHmacVerifier,
  Effect.gen(function* () {
    const createHmac = (data: string, secret: string) =>
      Effect.tryPromise({
        try: async () => {
          // Handle empty or invalid secrets gracefully
          if (!secret || secret.trim() === "") {
            return null; // Signal invalid secret
          }

          try {
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
              encoder.encode(data),
            );

            const hmacResult = Array.from(new Uint8Array(signature))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

            return hmacResult;
          } catch {
            return null;
          }
        },
        catch: () => null,
      }).pipe(Effect.catchAll(() => Effect.succeed(null)));

    const buildQueryString = (params: Record<string, string>) => {
      return Object.keys(params)
        .sort()
        .map((key) => {
          // URL decode the values before building query string for HMAC
          const decodedValue = decodeURIComponent(params[key]);
          return `${key}=${decodedValue}`;
        })
        .join("&");
    };

    return {
      verifyInstallRequest: (
        request: OAuthInstallRequest,
        secret: ClientSecret,
      ) =>
        Effect.gen(function* () {
          const { hmac, ...params } = request;
          const queryString = buildQueryString(params);
          const expectedHmac = yield* createHmac(queryString, secret);

          // If HMAC creation failed (invalid secret), return false
          if (expectedHmac === null) {
            return false;
          }

          return hmac === expectedHmac;
        }).pipe(
          Effect.withSpan("ShopifyOAuthHmacVerifier.verifyInstallRequest"),
        ),

      verifyCallbackRequest: (
        request: OAuthCallbackRequest,
        secret: ClientSecret,
      ) =>
        Effect.gen(function* () {
          const { hmac, ...params } = request;
          const queryString = buildQueryString(params);
          const expectedHmac = yield* createHmac(queryString, secret);

          // If HMAC creation failed (invalid secret), return false
          if (expectedHmac === null) {
            return false;
          }

          return hmac === expectedHmac;
        }).pipe(
          Effect.withSpan("ShopifyOAuthHmacVerifier.verifyCallbackRequest"),
        ),
    };
  }),
);
