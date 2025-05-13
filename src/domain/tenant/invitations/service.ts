import { env } from "cloudflare:workers";
import type { Email } from "@/domain/global/email/model";
import type {
  Invitation,
  InvitationId,
  InvitationStatus,
  NewInvitation,
} from "@/domain/tenant/invitations/models";
import {
  generateToken,
  validateToken,
} from "@/domain/tenant/invitations/tokenUtils"; // Import the utility functions
import { OrgDbError } from "@/domain/tenant/organization/model";
import { schema } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";

export abstract class OrgInvitationRepo extends Context.Tag(
  "@core/organization/OrgInvitationRepo",
)<
  OrgInvitationRepo,
  {
    readonly create: (
      invitationData: NewInvitation,
    ) => Effect.Effect<{ invitation: Invitation; token: string }, OrgDbError>; // Return both invitation and token
    readonly findPendingByEmail: (
      email: Email,
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>;
    readonly getInvitation: (
      token: string, // Accept token for validation
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>;
    readonly updateStatus: (
      invitationId: InvitationId,
      status: InvitationStatus,
      acceptedAt?: Date,
    ) => Effect.Effect<Invitation, OrgDbError>;
    // readonly findById: (
    //   id: Invitation["id"], // Use branded InvitationId
    // ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    // readonly findByOrgIdAndEmailAndStatus: (
    //   orgId: Invitation["organizationId"], // Use branded OrganizationId
    //   email: Email, // Use branded Email
    //   status: InvitationStatus,
    // ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    // readonly updateStatus: (
    //   id: Invitation["id"], // Use branded InvitationId
    //   status: InvitationStatus,
    //   acceptedAt?: Date, // Domain expects Date, maps to number in schema
    // ) => Effect.Effect<Invitation, OrgDbError>; // Effect error type is OrgDbError, success is Invitation
    // readonly findPendingByOrgIdAndEmail: (
    //   orgId: Invitation["organizationId"], // Use branded OrganizationId
    //   email: Email, // Use branded Email
    // ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    // readonly findExpiredPending: (
    //   now: Date,
    // ) => Effect.Effect<ReadonlyArray<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is ReadonlyArray<Invitation>
  }
>() {}

export const OrgInvitationRepoLive = Layer.effect(
  OrgInvitationRepo,
  Effect.gen(function* (_) {
    const drizzleClient = yield* DrizzleDOClient;
    const orgInvitationRepo = {
      create: (invitationData: NewInvitation) =>
        Effect.gen(function* () {
          // Generate token
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(schema.invitation)
                .values({
                  ...invitationData,
                  id: crypto.randomUUID(),
                  email: invitationData.inviteeEmail,
                })
                .returning(),
            catch: (error) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          const invitation = result[0] as unknown as Invitation; // Cast to Invitation
          const token = yield* Effect.tryPromise(() =>
            generateToken(invitation.id, env.SECRET_KEY),
          ); // Generate token for the invitation

          return { invitation, token }; // Return both invitation and token
        }).pipe(
          Effect.mapError((error) => {
            return new OrgDbError({
              cause: error,
            });
          }),
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

          const invitation = result[0] as unknown as Invitation; // Cast to Invitation
          return Option.fromNullable(invitation); // Return as Option<Invitation>
        }),

      getInvitation: (token: string) =>
        Effect.gen(function* () {
          // Validate the token
          const invitationId = yield* Effect.tryPromise(() =>
            validateToken(token, env.SECRET_KEY),
          ).pipe(
            Effect.mapError((error) => {
              return new OrgDbError({
                cause: error,
              });
            }),
          );

          if (!invitationId) {
            return Option.none(); // Return none if the token is invalid
          }

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

          const invitation = result[0] as unknown as Invitation; // Cast to Invitation
          return Option.fromNullable(invitation); // Return as Option<Invitation>
        }),

      updateStatus: (
        // TODO: Add token validation
        invitationId: InvitationId,
        status: InvitationStatus,
        acceptedAt?: Date,
      ) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(schema.invitation)
                .set({
                  status,
                })
                .where(eq(schema.invitation.id, invitationId))
                .returning(),
            catch: (error: unknown) => {
              return new OrgDbError({
                cause: error,
              });
            },
          });

          const invitation = result[0] as unknown as Invitation; // Cast to Invitation
          return invitation; // Return the updated invitation
        }),
    };

    return orgInvitationRepo;
  }),
);
