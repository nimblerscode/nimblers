import { eq } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
import {
  InvalidOrganizationError,
  SessionLookupError,
  SessionRepo,
  SessionUpdateError,
} from "@/domain/global/session/service";
import type { UserId } from "@/domain/global/user/model";
import type { OrganizationId } from "@/domain/shopify/store/models";
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
              new SessionLookupError({
                message: `Failed to lookup session for user: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                userId,
                cause: error,
              }),
          });

          const activeOrgId = result[0]?.activeOrganizationId;
          return activeOrgId ? Option.some(activeOrgId) : Option.none();
        }),

      updateActiveOrganizationId: (
        userId: UserId,
        organizationId: OrganizationId,
      ) =>
        Effect.gen(function* () {
          // Basic validation - ensure organizationId is not empty
          if (!organizationId || organizationId.trim() === "") {
            return yield* Effect.fail(
              new InvalidOrganizationError({
                message: "Organization ID cannot be empty",
                organizationId,
                userId,
              }),
            );
          }

          yield* Effect.tryPromise({
            try: () =>
              drizzleClient
                .update(session)
                .set({
                  activeOrganizationId: organizationId,
                  updatedAt: new Date(),
                })
                .where(eq(session.userId, userId)),
            catch: (error) => {
              // Check for specific database constraint errors
              if (
                error instanceof Error &&
                error.message.includes("FOREIGN KEY constraint")
              ) {
                return new InvalidOrganizationError({
                  message:
                    "Invalid organization ID - organization does not exist",
                  organizationId,
                  userId,
                });
              }

              return new SessionUpdateError({
                message: `Failed to update session: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                userId,
                organizationId,
                cause: error,
              });
            },
          });
        }),
    };
  }),
);
