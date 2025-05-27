import { Clock, Context, Effect, Layer, Option } from "effect";
import { renderInvitationEmailHTML } from "@/app/email-templates";
// Type-only imports
import { sendEmail as sendEmailEffect } from "@/application/global/email/sendEmail";
import { EmailService } from "@/domain/global/email/service";
import type { UserId } from "@/domain/global/user/model";

import {
  DuplicatePendingInvitation,
  type GetInvitationError,
  InvalidToken,
  type Invitation,
  InvitationAlreadyAccepted,
  InvitationAlreadyRevoked,
  type InvitationError,
  InvitationExpired,
  InvitationNotFound,
  type NewInvitation,
  UserAlreadyMember,
} from "@/domain/tenant/invitations/models";
import {
  InvitationRepo,
  InvitationUseCase,
} from "@/domain/tenant/invitations/service";
import { InviteToken } from "@/domain/tenant/invitations/tokenUtils";
import { MemberRepo } from "@/domain/tenant/member/service";
import { OrgDbError } from "@/domain/tenant/organization/model";

const INVITATION_EXPIRY_DAYS = 7;

export class InvitationDOService extends Context.Tag(
  "@infrastructure/organization/invitations/InvitationDOService",
)<
  InvitationDOService,
  {
    readonly get: (
      token: string,
    ) => Effect.Effect<Invitation, GetInvitationError | InvalidToken>;
    readonly accept: (
      token: string,
      userId: UserId,
    ) => Effect.Effect<void, GetInvitationError | InvalidToken>;
    readonly create: (
      input: NewInvitation,
      organizationSlug: string,
    ) => Effect.Effect<Invitation, InvitationError | OrgDbError>;
    readonly list: (
      organizationSlug: string,
    ) => Effect.Effect<Invitation[], InvitationError | OrgDbError>;
  }
>() {}

// --- Live Layer for CreateInvitationUseCase ---_ts
export const InvitationUseCaseLive = (doId: DurableObjectId) =>
  Layer.effect(
    InvitationUseCase,
    Effect.gen(function* () {
      const invitationRepo = yield* InvitationRepo;
      const orgMemberRepo = yield* MemberRepo;
      const resolvedEmailService = yield* EmailService;
      const inviteToken = yield* InviteToken;

      return {
        create: (input: NewInvitation) => {
          return Effect.gen(function* () {
            const { inviterId, inviteeEmail, role } = input;

            const existingMemberOpt =
              yield* orgMemberRepo.findMembership(inviteeEmail);

            if (Option.isSome(existingMemberOpt)) {
              const member = existingMemberOpt.value;
              return yield* Effect.fail(
                new UserAlreadyMember({
                  message: "Email already belongs to an organization member.",
                  userId: member.userId,
                }),
              );
            }

            const existingPendingInviteOpt =
              yield* invitationRepo.findPendingByEmail(inviteeEmail);
            if (Option.isSome(existingPendingInviteOpt)) {
              return yield* Effect.fail(
                new DuplicatePendingInvitation({
                  message:
                    "A pending invitation already exists for this email.",
                  email: inviteeEmail,
                }),
              );
            }

            const _expiresAt = yield* Effect.gen(function* () {
              const currentTime = yield* Clock.currentTimeMillis;
              return new Date(
                currentTime + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
              );
            });

            const newInvitationData: NewInvitation = {
              inviterId,
              inviteeEmail,
              role,
            };

            const createdInvitation = yield* invitationRepo
              .create(newInvitationData)
              .pipe(
                Effect.catchAll((error) => {
                  return Effect.fail(
                    new InvitationNotFound({ message: error.message }),
                  );
                }),
              );

            const token = yield* inviteToken
              .sign({
                doId: doId.name || "default",
                invitationId: createdInvitation.id,
              })
              .pipe(
                Effect.mapError((error) => new OrgDbError({ cause: error })),
              );

            // change for the url, could be localhost or production
            // add the localhost url for development
            const invitationLink = `http://localhost:5173/invite/${token}`;
            // const invitationLink = `https://app.nimblers.co/invite/${token}`;

            // Use a generic inviter name to avoid complexity
            const inviterName = "Your teammate";
            const organizationName = doId.name || "Organization"; // Fallback name

            const emailProps = {
              inviteeEmail,
              inviterName,
              organizationName,
              organizationSlug: organizationName,
              role,
              invitationLink,
              expiresAt: _expiresAt,
            };

            const emailBody = yield* Effect.tryPromise({
              try: () => renderInvitationEmailHTML(emailProps),
              catch: (error) => new OrgDbError({ cause: error }),
            });

            const emailSendingEffect = sendEmailEffect({
              from: "welcome@email.nimblers.co",
              to: inviteeEmail,
              subject: `You're invited to join ${organizationName}!`,
              body: emailBody,
            });

            yield* emailSendingEffect.pipe(
              Effect.provideService(EmailService, resolvedEmailService),
            );

            return createdInvitation;
          }).pipe(
            Effect.catchTag("EmailError", (emailError) =>
              Effect.fail(new OrgDbError({ cause: emailError })),
            ),
            Effect.catchTag("MemberDbError", (memberDbError) =>
              Effect.fail(new OrgDbError({ cause: memberDbError })),
            ),
            Effect.catchTag("MemberNotFoundError", (memberNotFoundError) =>
              Effect.fail(new OrgDbError({ cause: memberNotFoundError })),
            ),
            Effect.withSpan("CreateInvitationUseCase.create"),
          );
        },
        get: (
          token: string, // Accept token for validation
        ): Effect.Effect<Invitation, GetInvitationError | InvalidToken> => {
          return Effect.gen(function* () {
            const verifiedToken = yield* inviteToken.verify(token).pipe(
              Effect.mapError((error) => {
                return new OrgDbError({
                  cause: error,
                });
              }),
            );

            const invitationId = verifiedToken.invitationId;

            if (!invitationId) {
              return yield* Effect.fail(
                new InvalidToken({
                  message: "Invalid token.",
                }),
              );
            }

            // Retrieve the invitation using the invitationId and token
            const invitationOpt =
              yield* invitationRepo.getInvitation(invitationId);

            if (Option.isNone(invitationOpt)) {
              return yield* Effect.fail(
                new InvitationNotFound({
                  message: "Invitation not found.",
                }),
              );
            }

            const invitation = invitationOpt.value;

            if (invitation.status === "accepted") {
              return yield* Effect.fail(
                new InvitationAlreadyAccepted({
                  message: "Invitation has already been accepted.",
                  invitationId,
                }),
              );
            }

            if (invitation.status === "revoked") {
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

            if (invitation.status === "expired") {
              return yield* Effect.fail(
                new InvitationExpired({
                  message: "Invitation has expired.",
                  invitationId,
                  expiredAt: new Date(invitation.expiresAt),
                }),
              );
            }

            // At this point, invitation should be pending and not yet past its expiresAt time.
            if (invitation.status !== "pending") {
              return yield* Effect.fail(
                new InvitationNotFound({
                  message: `Invitation is in an invalid state: ${invitation.status}`,
                }),
              );
            }

            return invitation;
          }).pipe(Effect.withSpan("GetInvitationUseCase.get"));
        },
        list: () => {
          return Effect.gen(function* () {
            const invitations = yield* invitationRepo.findAll();
            return invitations;
          }).pipe(Effect.withSpan("InvitationUseCase.list"));
        },
        accept: (token: string, userId: UserId) => {
          return Effect.gen(function* () {
            // First verify the token and get the invitation
            const verifiedToken = yield* inviteToken.verify(token).pipe(
              Effect.mapError((error) => {
                return new OrgDbError({
                  cause: error,
                });
              }),
            );

            const invitationId = verifiedToken.invitationId;

            // Get the invitation
            const invitationOpt =
              yield* invitationRepo.getInvitation(invitationId);

            if (Option.isNone(invitationOpt)) {
              return yield* Effect.fail(
                new InvitationNotFound({
                  message: "Invitation not found",
                }),
              );
            }

            const invitation = invitationOpt.value;

            // Check if invitation is already accepted
            if (invitation.status === "accepted") {
              return yield* Effect.fail(
                new InvitationAlreadyAccepted({
                  message: "Invitation has already been accepted",
                  invitationId,
                }),
              );
            }

            // Check if invitation is expired
            if (
              invitation.status === "expired" ||
              invitation.expiresAt < Date.now()
            ) {
              return yield* Effect.fail(
                new InvitationExpired({
                  message: "Invitation has expired",
                  invitationId,
                  expiredAt: new Date(invitation.expiresAt),
                }),
              );
            }

            // Update invitation status to accepted

            yield* invitationRepo.updateStatus(invitationId, "accepted");

            // Create organization membership

            yield* orgMemberRepo
              .createMember({
                userId,
                role: invitation.role,
              })
              .pipe(
                Effect.mapError((error) => {
                  return new OrgDbError({ cause: error });
                }),
              );

            return;
          }).pipe(Effect.withSpan("InvitationUseCase.accept"));
        },
      };
    }),
  );
