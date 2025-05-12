import { Clock, Context, Effect, Layer, Option, Schema } from "effect";

// Value imports for services (Tags), schemas, and instantiated errors
import { type EmailError, EmailService } from "../../../email/services";
import { MemberRepo } from "../../../member/service";
import type { OrgDbError } from "../../service";
import {
  DuplicatePendingInvitation,
  type Invitation,
  InvitationStatusLiterals,
  InvitationStatusSchema,
  UserAlreadyMember,
} from "../models";

// Type-only imports
import type {
  CreateInvitationInput,
  InvitationError,
  NewInvitation,
} from "../models";
import { OrgInvitationRepo } from "../service";

const INVITATION_EXPIRY_DAYS = 7;

// --- CreateInvitation Use Case Definition ---_ts
export const makeCreateInvitationUseCase = Effect.gen(function* (_) {
  const orgInvitationRepo = yield* _(OrgInvitationRepo);
  const orgMemberRepo = yield* _(MemberRepo);
  const emailService = yield* _(EmailService);

  return {
    create: (input: CreateInvitationInput) => {
      return Effect.gen(function* (_) {
        const { organizationId, inviterId, inviteeEmail, role } = input;

        const existingMemberOpt = yield* orgMemberRepo.findMembership(
          organizationId,
          inviteeEmail
        );

        if (Option.isSome(existingMemberOpt)) {
          const member = existingMemberOpt.value;
          return yield* Effect.fail(
            new UserAlreadyMember({
              message: "Email already belongs to an organization member.",
              userId: member.userId,
              organizationId,
            })
          );
        }

        const existingPendingInviteOpt =
          yield* orgInvitationRepo.findPendingByOrgIdAndEmail(
            organizationId,
            inviteeEmail
          );
        if (Option.isSome(existingPendingInviteOpt)) {
          return yield* Effect.fail(
            new DuplicatePendingInvitation({
              message: "A pending invitation already exists for this email.",
              email: inviteeEmail,
              organizationId,
            })
          );
        }

        const expiresAt = yield* Effect.gen(function* (_) {
          const currentTime = yield* Clock.currentTimeMillis;
          return new Date(
            currentTime + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
          );
        });

        const newInvitationData: NewInvitation = {
          organizationId,
          email: inviteeEmail,
          inviterId,
          role,
          status: Schema.decodeUnknownSync(InvitationStatusSchema)(
            InvitationStatusLiterals.pending
          ),
          expiresAt,
        };

        const createdInvitation = yield* orgInvitationRepo.create(
          newInvitationData
        );

        // TODO: Replace with actual invitation link
        const invitationLink = `https://app.example.com/invite/${organizationId}/${createdInvitation.id}`;

        yield* emailService.sendEmail({
          from: "invitations@example.com",
          to: inviteeEmail,
          subject: "You're invited to join an organization!",
          body: `Please click the following link to accept your invitation: ${invitationLink}`,
        });

        return createdInvitation;
      }).pipe(
        Effect.catchAll((e) =>
          Effect.fail(e as InvitationError | OrgDbError | EmailError)
        ),
        Effect.withSpan("CreateInvitationUseCase.create")
      );
    },
  };
});

// --- Service Interface & Tag for CreateInvitationUseCase ---_ts
export class CreateInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/CreateInvitationUseCase"
)<
  CreateInvitationUseCase,
  {
    readonly create: (
      input: CreateInvitationInput
    ) => Effect.Effect<Invitation, InvitationError | OrgDbError | EmailError>;
  }
>() {}

// --- Live Layer for CreateInvitationUseCase ---_ts
export const CreateInvitationUseCaseLive = Layer.effect(
  CreateInvitationUseCase,
  makeCreateInvitationUseCase
);
