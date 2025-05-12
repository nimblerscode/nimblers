import { Clock, Context, Effect, Layer, Option, Schema } from "effect";

import type { OrgDbError } from "../../service";
import {
  type GetInvitationInput,
  type Invitation,
  InvitationAlreadyAccepted,
  InvitationAlreadyRevoked,
  type InvitationError,
  InvitationExpired,
  InvitationNotFound,
  type InvitationStatus,
  InvitationStatusLiterals,
  InvitationStatusSchema,
} from "../models";
import { OrgInvitationRepo } from "../service";

// Define a combined error type for this use case
export type GetInvitationError = InvitationError | OrgDbError;

// --- GetInvitation Use Case Definition ---_ts
export const makeGetInvitationUseCase = Effect.gen(function* (_) {
  const orgInvitationRepo = yield* _(OrgInvitationRepo);

  return {
    get: (
      input: GetInvitationInput
    ): Effect.Effect<Invitation, GetInvitationError> => {
      return Effect.gen(function* (_) {
        const { invitationId, organizationId } = input;

        const invitationOpt = yield* orgInvitationRepo.findById(invitationId);

        if (Option.isNone(invitationOpt)) {
          return yield* Effect.fail(
            new InvitationNotFound({
              message: "Invitation not found.",
              invitationId,
            })
          );
        }

        const invitation = invitationOpt.value;

        // Verify organizationId matches (important if invitationId is not globally unique across orgs in query)
        if (invitation.organizationId !== organizationId) {
          // Technically, this is also a form of "not found" for this specific org/invite combination.
          return yield* Effect.fail(
            new InvitationNotFound({
              message: "Invitation not found for this organization.",
              invitationId,
            })
          );
        }

        if (
          invitation.status ===
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.accepted
          )
        ) {
          // Ensure acceptedAt exists if status is accepted, use current date as fallback for error reporting
          const acceptedAtDate =
            typeof invitation.acceptedAt === "number"
              ? new Date(invitation.acceptedAt)
              : new Date();
          return yield* Effect.fail(
            new InvitationAlreadyAccepted({
              message: "Invitation has already been accepted.",
              invitationId,
              acceptedAt: acceptedAtDate,
            })
          );
        }

        if (invitation.status === ("revoked" as InvitationStatus)) {
          return yield* Effect.fail(
            new InvitationAlreadyRevoked({
              message: "Invitation has been revoked.",
              invitationId,
            })
          );
        }

        const isInvitationExpired = yield* Effect.gen(function* (_) {
          const currentTime = yield* Clock.currentTimeMillis;
          return invitation.expiresAt < currentTime;
        });

        // Invitation.expiresAt is a number (timestamp) from the schema
        if (isInvitationExpired) {
          // Fail with InvitationExpired if current time is past expiresAt
          return yield* Effect.fail(
            new InvitationExpired({
              message: "Invitation has expired.",
              invitationId,
              expiredAt: new Date(invitation.expiresAt),
            })
          );
        }

        // If status is 'expired' but current time check didn't catch it (e.g. cron hasn't run), also treat as expired.
        // Or, if the above check handles it, this specific status check might be redundant if expiresAt is the source of truth.
        if (
          invitation.status ===
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.expired
          )
        ) {
          return yield* Effect.fail(
            new InvitationExpired({
              message: "Invitation has expired.",
              invitationId,
              expiredAt: new Date(invitation.expiresAt),
            })
          );
        }

        // At this point, invitation should be pending and not yet past its expiresAt time.
        if (
          invitation.status !==
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.pending
          )
        ) {
          // Catch-all for any other non-pending status that wasn't explicitly handled.
          // This could indicate an invalid state or a missed case.
          return yield* Effect.fail(
            new InvitationNotFound({
              message: `Invitation is in an invalid state: ${invitation.status}`,
              invitationId,
            })
          );
        }

        return invitation;
      }).pipe(Effect.withSpan("GetInvitationUseCase.get")); // Changed from "GetInvitationUseCase" to "GetInvitationUseCase.get" for clarity
    },
  };
});

// --- Service Interface & Tag for GetInvitationUseCase ---_ts
export class GetInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/GetInvitationUseCase"
)<
  GetInvitationUseCase,
  {
    readonly get: (
      input: GetInvitationInput
    ) => Effect.Effect<Invitation, GetInvitationError>;
  }
>() {}

// --- Live Layer for GetInvitationUseCase ---_ts
export const GetInvitationUseCaseLive = Layer.effect(
  GetInvitationUseCase,
  makeGetInvitationUseCase
);
