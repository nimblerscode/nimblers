import { env } from "cloudflare:workers";
import type {
  GetInvitationError,
  Invitation,
} from "@/domain/tenant/invitations/models";
import {
  InvalidToken,
  InvitationAlreadyRevoked,
  InvitationExpired,
  InvitationNotFound,
  InvitationStatusLiterals,
  InvitationStatusSchema,
} from "@/domain/tenant/invitations/models";
import { OrgInvitationRepo } from "@/domain/tenant/invitations/service";
import { validateToken } from "@/domain/tenant/invitations/tokenUtils";
import { OrgDbError } from "@/domain/tenant/organization/model";
import { Clock, Context, Effect, Layer, Option, Schema } from "effect";

// Define a combined error type for this use case

// --- GetInvitation Use Case Definition ---
export const makeGetInvitationUseCase = Effect.gen(function* () {
  const orgInvitationRepo = yield* OrgInvitationRepo;

  return {
    get: (
      token: string, // Accept token for validation
    ): Effect.Effect<Invitation, GetInvitationError | InvalidToken> => {
      return Effect.gen(function* () {
        // decode the token from tokenUtils

        // decode the token from tokenUtils

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
          return yield* Effect.fail(
            new InvalidToken({
              message: "Invalid token.",
            }),
          );
        }

        // Retrieve the invitation using the invitationId and token
        const invitationOpt = yield* orgInvitationRepo.getInvitation(
          token, // Pass the token for validation
        );

        if (Option.isNone(invitationOpt)) {
          return yield* Effect.fail(
            new InvitationNotFound({
              message: "Invitation not found.",
            }),
          );
        }

        const invitation = invitationOpt.value;

        // if (
        //   invitation.status ===
        //   Schema.decodeUnknownSync(InvitationStatusSchema)(
        //     InvitationStatusLiterals.accepted
        //   )
        // ) {
        //   const acceptedAtDate =
        //     typeof invitation.acceptedAt === "number"
        //       ? new Date(invitation.acceptedAt)
        //       : new Date();
        //   return yield* Effect.fail(
        //     new InvitationAlreadyAccepted({
        //       message: "Invitation has already been accepted.",
        //       invitationId,
        //       acceptedAt: acceptedAtDate,
        //     })
        //   );
        // }

        if (
          invitation.status ===
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.revoked,
          )
        ) {
          return yield* Effect.fail(
            new InvitationAlreadyRevoked({
              message: "Invitation has been revoked.",
              invitationId,
            }),
          );
        }

        const isInvitationExpired = yield* Effect.gen(function* () {
          const currentTime = yield* Clock.currentTimeMillis;
          return invitation.expiresAt < currentTime;
        });

        if (isInvitationExpired) {
          return yield* Effect.fail(
            new InvitationExpired({
              message: "Invitation has expired.",
              invitationId,
              expiredAt: new Date(invitation.expiresAt),
            }),
          );
        }

        if (
          invitation.status ===
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.expired,
          )
        ) {
          return yield* Effect.fail(
            new InvitationExpired({
              message: "Invitation has expired.",
              invitationId,
              expiredAt: new Date(invitation.expiresAt),
            }),
          );
        }

        // At this point, invitation should be pending and not yet past its expiresAt time.
        if (
          invitation.status !==
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.pending,
          )
        ) {
          return yield* Effect.fail(
            new InvitationNotFound({
              message: `Invitation is in an invalid state: ${invitation.status}`,
            }),
          );
        }

        return invitation; // Return the valid invitation
      }).pipe(Effect.withSpan("GetInvitationUseCase.get"));
    },
  };
});

// --- Service Interface & Tag for GetInvitationUseCase ---
export class GetInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/GetInvitationUseCase",
)<
  GetInvitationUseCase,
  {
    readonly get: (
      token: string, // Accept token for validation
    ) => Effect.Effect<Invitation, GetInvitationError | InvalidToken>;
  }
>() {}

// --- Live Layer for GetInvitationUseCase ---
export const GetInvitationUseCaseLive = Layer.effect(
  GetInvitationUseCase,
  makeGetInvitationUseCase,
);
