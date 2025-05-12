import { Context, Effect, Layer, Option, Schema } from "effect";

// --- Schemas and Models ---
import {
  type AcceptInvitationError,
  type AcceptInvitationInput,
  GetInvitationInput,
  InvitationStatusLiterals,
  InvitationStatusSchema,
} from "../models";

import type { Member, NewMember } from "@/core/member/model";
import { UserRepo } from "@/core/user/services";
import { MemberRepo } from "../../../member/service";
// --- Services ---
import { OrgInvitationRepo } from "../service";
import { GetInvitationUseCase } from "./getInvitation";

// --- AcceptInvitation Use Case Definition ---
export const makeAcceptInvitationUseCase = Effect.gen(function* (_) {
  const getInvitationUseCase = yield* _(GetInvitationUseCase);
  const orgInvitationRepo = yield* _(OrgInvitationRepo);
  const orgMemberRepo = yield* _(MemberRepo);
  const userRepo = yield* _(UserRepo);

  return {
    accept: (
      input: AcceptInvitationInput
    ): Effect.Effect<Member, AcceptInvitationError> => {
      return Effect.gen(function* (_) {
        const { invitationId, organizationId } = input;

        // 1. Get and validate invitation
        const getInvitationInput = GetInvitationInput.make({
          invitationId,
          organizationId,
        });
        // Note: `invitation` here is of type `Invitation` from `../models`
        const invitation = yield* getInvitationUseCase.get(getInvitationInput);

        // At this point, getInvitationUseCase has validated that the invitation exists,
        // belongs to the org, is pending, and not expired.

        // 2. Create or link Global User via UserRepo (delegates to better-auth)
        // UserRepo.findOrCreateUserByEmail will handle password hashing.
        // `globalUser` here is of type `User` from `../../../user/models`
        const user = yield* userRepo.findByEmail(invitation.email);

        const globalUser = Option.getOrThrow(user);

        // 3. Create Organization Member record
        const newOrgMemberData: NewMember = {
          organizationId: invitation.organizationId, // from the validated invitation
          userId: globalUser.id, // from the created/found global user
          role: invitation.role, // from the invitation
        };
        const orgMember = yield* orgMemberRepo.createMember(newOrgMemberData);

        // 4. Update Invitation status
        yield* orgInvitationRepo.updateStatus(
          invitation.id,
          Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.accepted
          ),
          new Date()
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
