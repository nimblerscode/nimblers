import { EmailService } from "@/domain/global/email/service";
import {
  DuplicatePendingInvitation,
  InvitationNotFound,
  UserAlreadyMember,
} from "@/domain/tenant/invitations/models";
import { MemberRepo } from "@/domain/tenant/member/service";
import type { OrgDbError } from "@/domain/tenant/organization/model";
import { Clock, Context, Effect, Layer, Option } from "effect";

// Type-only imports
import type {
  FindPendingByEmailInput,
  Invitation,
  InvitationError,
  NewInvitation,
} from "@/domain/tenant/invitations/models";
import { OrgInvitationRepo } from "@/domain/tenant/invitations/service";

const INVITATION_EXPIRY_DAYS = 7;

// --- CreateInvitation Use Case Definition ---_ts
export const makeCreateInvitationUseCase = Effect.gen(function* () {
  const orgInvitationRepo = yield* OrgInvitationRepo;
  const orgMemberRepo = yield* MemberRepo;
  const emailService = yield* EmailService;

  return {
    create: (input: NewInvitation) => {
      return Effect.gen(function* () {
        const { organizationId, inviterId, inviteeEmail, role } = input;

        const existingMemberOpt =
          yield* orgMemberRepo.findMembership(inviteeEmail);

        if (Option.isSome(existingMemberOpt)) {
          const member = existingMemberOpt.value;
          return yield* Effect.fail(
            new UserAlreadyMember({
              message: "Email already belongs to an organization member.",
              userId: member.userId,
              organizationId,
            }),
          );
        }

        const existingPendingInviteOpt =
          yield* orgInvitationRepo.findPendingByEmail(inviteeEmail);
        if (Option.isSome(existingPendingInviteOpt)) {
          return yield* Effect.fail(
            new DuplicatePendingInvitation({
              message: "A pending invitation already exists for this email.",
              email: inviteeEmail,
            }),
          );
        }

        const expiresAt = yield* Effect.gen(function* () {
          const currentTime = yield* Clock.currentTimeMillis;
          return new Date(
            currentTime + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          );
        });

        const newInvitationData: NewInvitation = {
          organizationId,
          inviterId,
          inviteeEmail,
          role,
        };

        const createdInvitation =
          yield* orgInvitationRepo.create(newInvitationData);

        // TODO: Replace with actual invitation link
        const invitationLink = `https://app.example.com/invite?token=${createdInvitation.token}`;

        yield* emailService.sendEmail({
          from: "invitations@example.com",
          to: inviteeEmail,
          subject: "You're invited to join an organization!",
          body: `Please click the following link to accept your invitation: ${invitationLink}`,
        });

        return createdInvitation;
      }).pipe(
        Effect.catchAll((e) => Effect.fail(e as InvitationError | OrgDbError)),
        Effect.withSpan("CreateInvitationUseCase.create"),
      );
    },
    findPendingByEmail: (input: FindPendingByEmailInput) => {
      return Effect.gen(function* () {
        const { email } = input;

        const invitation = yield* orgInvitationRepo.findPendingByEmail(email);

        return invitation;
      }).pipe(
        Effect.catchAll((e) => Effect.fail(e as InvitationError | OrgDbError)),
        Effect.withSpan("CreateInvitationUseCase.findPendingByEmail"),
      );
    },
    getInvitation: (
      token: string, // Accept token for validation
    ) => {
      return Effect.gen(function* () {
        const invitation = yield* orgInvitationRepo.getInvitation(token);

        if (Option.isNone(invitation)) {
          return yield* Effect.fail(
            new InvitationNotFound({
              message: "Invitation not found.",
            }),
          );
        }

        return invitation.value;
      }).pipe(
        Effect.catchAll((e) => Effect.fail(e as InvitationError | OrgDbError)),
        Effect.withSpan("CreateInvitationUseCase.getInvitation"),
      );
    },
  };
});

// --- Service Interface & Tag for CreateInvitationUseCase ---_ts
export class CreateInvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/CreateInvitationUseCase",
)<
  CreateInvitationUseCase,
  {
    readonly create: (
      input: NewInvitation,
    ) => Effect.Effect<
      { invitation: Invitation; token: string },
      InvitationError | OrgDbError
    >; // Update return type
    readonly getInvitation: (
      token: string, // Accept token for validation
    ) => Effect.Effect<Invitation, InvitationError | OrgDbError>;
    readonly findPendingByEmail: (
      input: FindPendingByEmailInput,
    ) => Effect.Effect<Option.Option<Invitation>, InvitationError | OrgDbError>;
  }
>() {}

// --- Live Layer for CreateInvitationUseCase ---_ts
export const CreateInvitationUseCaseLive = Layer.effect(
  CreateInvitationUseCase,
  makeCreateInvitationUseCase,
);
