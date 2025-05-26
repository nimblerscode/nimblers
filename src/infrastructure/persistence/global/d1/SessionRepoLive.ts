import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import {
  SessionRepo,
  SessionUpdateError,
} from "@/domain/global/session/service";
import type { UserId } from "@/domain/global/user/model";
import { DrizzleD1Client } from "./drizzle";
import { session } from "./schema";

export const SessionRepoLive = Layer.effect(
  SessionRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleD1Client;

    return {
      getActiveOrganizationId: (userId: UserId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient
                .select({ activeOrganizationId: session.activeOrganizationId })
                .from(session)
                .where(eq(session.userId, userId))
                .limit(1),
            catch: (error) =>
              new SessionUpdateError({
                message: "Failed to fetch session data",
                cause: error,
              }),
          });

          return result[0]?.activeOrganizationId || null;
        }),

      updateActiveOrganizationId: (userId: UserId, organizationId: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient
                .update(session)
                .set({
                  activeOrganizationId: organizationId,
                  updatedAt: new Date(),
                })
                .where(eq(session.userId, userId)),
            catch: (error) =>
              new SessionUpdateError({
                message: "Failed to update session",
                cause: error,
              }),
          });
        }),
    };
  }),
);
