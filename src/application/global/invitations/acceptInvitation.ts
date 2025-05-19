import { Context, Effect, Layer, Schema } from "effect";
// --- Services ---
import { InvitationUseCase } from "@/application/tenant/invitations/service";
import { UserRepo } from "@/domain/global/user/service";
// --- Schemas and Models ---
import {
  type AcceptInvitationError,
  type AcceptInvitationInput,
  InvitationStatusLiterals,
  InvitationStatusSchema,
} from "@/domain/tenant/invitations/models";
import { InvitationRepo } from "@/domain/tenant/invitations/service";
import type { Member, NewMember } from "@/domain/tenant/member/model";
import { MemberRepo } from "@/domain/tenant/member/service";

// --- AcceptInvitation Use Case Definition ---
export const makeAcceptInvitationUseCase = Effect.gen(function* () {
  const invitationRepo = yield* InvitationRepo;
  const getInvitationUseCase = yield* InvitationUseCase;
  const orgMemberRepo = yield* MemberRepo;
  const userRepo = yield* UserRepo;

  return {
    accept: (
      input: AcceptInvitationInput
    ): Effect.Effect<Member, AcceptInvitationError> => {
      return Effect.gen(function* (_) {
        // Note: `invitation` here is of type `Invitation` from `../models`
        const invitation = yield* getInvitationUseCase.get(input.token);

        // At this point, getInvitationUseCase has validated that the invitation exists,
        // belongs to the org, is pending, and not expired.

        // 2. Create or link Global User via UserRepo (delegates to better-auth)
        // UserRepo.findOrCreateUserByEmail will handle password hashing.
        // `globalUser` here is of type `User` from `../../../user/models`
        const user = yield* userRepo.findByEmail(invitation.email);

        // 3. Create Organization Member record
        const newOrgMemberData: NewMember = {
          userId: user.id, // from the created/found global user
          role: invitation.role, // from the invitation
        };
        const orgMember = yield* orgMemberRepo.createMember(newOrgMemberData);

        // 4. Update Invitation status
        yield* invitationRepo.updateStatus(
          invitation.id,
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.accepted
          )
        );

        // Return the created organization member
        return orgMember;
      }).pipe(
        Effect.catchAll((e) => Effect.fail(e as AcceptInvitationError)), // Ensure error type
        Effect.withSpan("AcceptInvitationUseCase.accept")
      );
    },
  };
});

// --- Service Interface & Tag for AcceptInvitationUseCase ---
export abstract class AcceptInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/AcceptInvitationUseCase"
)<
  AcceptInvitationUseCase,
  {
    readonly accept: (
      input: AcceptInvitationInput
    ) => Effect.Effect<Member, AcceptInvitationError>;
  }
>() {}

// --- Live Layer for AcceptInvitationUseCase ---
export const AcceptInvitationUseCaseLive = Layer.effect(
  AcceptInvitationUseCase,
  makeAcceptInvitationUseCase
);
