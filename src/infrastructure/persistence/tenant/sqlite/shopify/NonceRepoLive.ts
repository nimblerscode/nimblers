import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import {
  InvalidNonceError,
  type Nonce,
  OAuthError,
} from "@/domain/shopify/oauth/models";
import { NonceManager } from "@/domain/shopify/oauth/service";
import { DrizzleDOClient } from "../drizzle";
import { nonces } from "./schema";

export const NonceRepoLive = Layer.effect(
  NonceManager,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      generate: () => Effect.succeed(crypto.randomUUID() as Nonce),

      store: (nonce: Nonce) =>
        Effect.gen(function* () {
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db.insert(nonces).values({
                nonce,
                expiresAt,
                consumed: false,
              }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to store nonce",
                cause: error,
              }),
          });
        }),

      verify: (nonce: Nonce) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(nonces)
                .where(eq(nonces.nonce, nonce))
                .limit(1),
            catch: (error) =>
              new InvalidNonceError({
                message: "Failed to verify nonce",
              }),
          });

          if (result.length === 0) {
            return false;
          }

          const nonceRecord = result[0];
          return (
            !nonceRecord.consumed &&
            new Date() < new Date(nonceRecord.expiresAt)
          );
        }),

      consume: (nonce: Nonce) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(nonces)
                .set({ consumed: true })
                .where(eq(nonces.nonce, nonce)),
            catch: (error) =>
              new InvalidNonceError({
                message: "Failed to consume nonce",
              }),
          });

          // Note: We rely on the unique constraint and database consistency
          // rather than checking affected rows in this simplified implementation
        }),
    };
  }),
);
