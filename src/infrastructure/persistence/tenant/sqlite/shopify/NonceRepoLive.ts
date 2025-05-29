import { Effect, Layer } from "effect";
import {
  InvalidNonceError,
  type Nonce,
  OAuthError,
} from "@/domain/global/shopify/oauth/models";
import { NonceManager } from "@/domain/global/shopify/oauth/service";
import { DrizzleShopifyOAuthClient } from "./drizzle";
import { makeShopifyOAuthDrizzleAdapter } from "./ShopifyOAuthDrizzleAdapter";

export const NonceRepoLive = Layer.effect(
  NonceManager,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleShopifyOAuthClient;
    const adapter = makeShopifyOAuthDrizzleAdapter(drizzleClient.db);

    return {
      generate: () => {
        const nonce = crypto.randomUUID();
        return Effect.succeed(nonce as Nonce);
      },

      store: (nonce: Nonce) =>
        Effect.gen(function* () {
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

          yield* Effect.tryPromise({
            try: () => adapter.storeNonce(nonce, expiresAt),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store nonce",
              }),
          });
        }),

      verify: (nonce: Nonce) =>
        Effect.gen(function* () {
          const isValid = yield* Effect.tryPromise({
            try: () => adapter.verifyNonce(nonce),
            catch: (error) =>
              new InvalidNonceError({
                message: "Failed to verify nonce",
              }),
          });

          return isValid;
        }),

      consume: (nonce: Nonce) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () => adapter.consumeNonce(nonce),
            catch: (error) =>
              new InvalidNonceError({
                message: "Invalid or expired nonce",
              }),
          });
        }),
    };
  }),
);
