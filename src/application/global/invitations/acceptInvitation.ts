import { Context, Effect, Layer, Schema } from "effect";

// --- Schemas and Models ---
import {
  type AcceptInvitationError,
  type AcceptInvitationInput,
  AcceptInvitationInputSchema,
  InvitationStatusLiterals,
  InvitationStatusSchema,
} from "@/domain/tenant/invitations/models";

// --- Services ---
import { GetInvitationUseCase } from "@/application/tenant/invitations/get";
import { UserRepo } from "@/domain/global/user/service";
import { OrgInvitationRepo } from "@/domain/tenant/invitations/service";
import type { Member, NewMember } from "@/domain/tenant/member/model";
import { MemberRepo } from "@/domain/tenant/member/service";

// --- AcceptInvitation Use Case Definition ---
export const makeAcceptInvitationUseCase = Effect.gen(function* (_) {
  const orgInvitationRepo = yield* _(OrgInvitationRepo);
  const getInvitationUseCase = yield* _(GetInvitationUseCase);
  const orgMemberRepo = yield* _(MemberRepo);
  const userRepo = yield* _(UserRepo);

  return {
    accept: (
      input: AcceptInvitationInput,
    ): Effect.Effect<Member, AcceptInvitationError> => {
      return Effect.gen(function* (_) {
        // 1. Get and validate invitation
        const getInvitationInput = AcceptInvitationInputSchema.make({
          ...input,
        });

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
        yield* orgInvitationRepo.updateStatus(
          invitation.id,
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.accepted,
          ),
          new Date(),
        );

        // Return the created organization member
        return orgMember;
      }).pipe(
        Effect.catchAll((e) => Effect.fail(e as AcceptInvitationError)), // Ensure error type
        Effect.withSpan("AcceptInvitationUseCase.accept"),
      );
    },
  };
});

// --- Service Interface & Tag for AcceptInvitationUseCase ---
export abstract class AcceptInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/AcceptInvitationUseCase",
)<
  AcceptInvitationUseCase,
  {
    readonly accept: (
      input: AcceptInvitationInput,
    ) => Effect.Effect<Member, AcceptInvitationError>;
  }
>() {}

// --- Live Layer for AcceptInvitationUseCase ---
export const AcceptInvitationUseCaseLive = Layer.effect(
  AcceptInvitationUseCase,
  makeAcceptInvitationUseCase,
);
