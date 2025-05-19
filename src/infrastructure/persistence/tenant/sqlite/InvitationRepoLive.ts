import type { Email } from "@/domain/global/email/model";
import type {
  InvitationId,
  InvitationStatus,
  NewInvitation,
} from "@/domain/tenant/invitations/models";
import { OrgDbError } from "@/domain/tenant/organization/model";
import {
  DrizzleDOClient,
  schema,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { eq } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
import { InvitationRepo } from "@/domain/tenant/invitations/service";
import type { UserId } from "@/domain/global/user/model";
import type { Invitation } from "@/domain/tenant/invitations/models";

type InvitationFromDB = {
  id: string;
  email: string;
  inviterId: string;
  role: string;
  status: InvitationStatus;
  expiresAt: number;
  createdAt: number;
};
// Utility to map DB invitation to domain Invitation with proper branded types
function mapDbInvitationToDomain(inv: InvitationFromDB): Invitation {
  return {
    id: inv.id as InvitationId,
    email: inv.email as Email,
    inviterId: inv.inviterId as UserId,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  };
}

export const InvitationRepoLive = Layer.effect(
  InvitationRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;
    // const inviteToken = yield* InviteToken;
    const invitationRepo = {
      create: (invitationData: NewInvitation) =>
        Effect.gen(function* () {
          const now = Date.now();
          const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now

          const result = yield* Effect.tryPromise({
            try: () => {
              const id = crypto.randomUUID();
              const nowDate = new Date(now);
              const expiresDate = new Date(expiresAt);

              return drizzleClient.db
                .insert(schema.invitation)
                .values({
                  id,
                  email: invitationData.inviteeEmail,
                  inviterId: invitationData.inviterId,
                  role: invitationData.role,
                  status: "pending",
                  expiresAt: expiresDate,
                  createdAt: nowDate,
                } satisfies typeof schema.invitation.$inferInsert)
                .returning();
            },
            catch: (error) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          const invitation = mapDbInvitationToDomain({
            ...result[0],
            expiresAt: Number(result[0].expiresAt),
            createdAt: Number(result[0].createdAt),
          });

          return invitation;
        }).pipe(
          Effect.mapError((error) => {
            return new OrgDbError({
              cause: error,
            });
          })
        ),

      findPendingByEmail: (email: Email) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(schema.invitation)
                .where(eq(schema.invitation.email, email)),
            catch: (error: unknown) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          if (!result[0]) return Option.none();

          const invitation = mapDbInvitationToDomain({
            ...result[0],
            expiresAt: Number(result[0].expiresAt),
            createdAt: Number(result[0].createdAt),
          });
          return Option.some(invitation);
        }),

      updateStatus: (invitationId: InvitationId, status: InvitationStatus) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(schema.invitation)
                .set({ status })
                .where(eq(schema.invitation.id, invitationId))
                .returning(),
            catch: (error: unknown) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          const invitation = mapDbInvitationToDomain({
            ...result[0],
            expiresAt: Number(result[0].expiresAt),
            createdAt: Number(result[0].createdAt),
          });
          return invitation;
        }),

      getInvitation: (invitationId: InvitationId) =>
        Effect.gen(function* () {
          console.log("invitationId", invitationId);
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(schema.invitation)
                .where(eq(schema.invitation.id, invitationId)),
            catch: (error: unknown) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          console.log("result", result);

          if (!result[0]) return Option.none();

          const invitation = mapDbInvitationToDomain({
            ...result[0],
            expiresAt: Number(result[0].expiresAt),
            createdAt: Number(result[0].createdAt),
          });
          return Option.some(invitation);
        }),
    };

    return invitationRepo;
  })
);
