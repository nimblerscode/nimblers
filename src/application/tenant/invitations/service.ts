import { EmailService } from "@/domain/global/email/service";
import { Clock, Context, Effect, Layer, Option } from "effect";

// Type-only imports
import { sendEmail as sendEmailEffect } from "@/application/global/email/sendEmail";
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
  "@infrastructure/organization/invitations/InvitationDOService"
)<
  InvitationDOService,
  {
    readonly get: (
      token: string
    ) => Effect.Effect<Invitation, GetInvitationError | InvalidToken>;
    readonly accept: (
      token: string
    ) => Effect.Effect<void, GetInvitationError | InvalidToken>;
    readonly create: (
      input: NewInvitation,
      organizationSlug: string
    ) => Effect.Effect<Invitation, InvitationError | OrgDbError>;
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

            const existingMemberOpt = yield* orgMemberRepo.findMembership(
              inviteeEmail
            );

            if (Option.isSome(existingMemberOpt)) {
              const member = existingMemberOpt.value;
              return yield* Effect.fail(
                new UserAlreadyMember({
                  message: "Email already belongs to an organization member.",
                  userId: member.userId,
                })
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
                })
              );
            }

            const expiresAt = yield* Effect.gen(function* () {
              const currentTime = yield* Clock.currentTimeMillis;
              return new Date(
                currentTime + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
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
                  console.log("error", error);
                  return Effect.fail(
                    new InvitationNotFound({ message: error.message })
                  );
                })
              );

            console.log("createdInvitation----->", createdInvitation);

            const token = yield* inviteToken
              .sign({
                doId,
                invitationId: createdInvitation.id,
              })
              .pipe(
                Effect.mapError((error) => new OrgDbError({ cause: error }))
              );

            const invitationLink = `https://app.example.com/invite?token=${token}`;

            const emailSendingEffect = sendEmailEffect({
              from: "welcome@email.nimblers.co",
              to: inviteeEmail,
              subject: "You're invited to join an organization!",
              body: `Please click the following link to accept your invitation: ${invitationLink}`,
            });

            yield* emailSendingEffect.pipe(
              Effect.provideService(EmailService, resolvedEmailService)
            );

            console.log("createdInvitation", createdInvitation);

            return createdInvitation;
          }).pipe(
            Effect.catchTag("EmailError", (emailError) =>
              Effect.fail(new OrgDbError({ cause: emailError }))
            ),
            Effect.catchTag("MemberDbError", (memberDbError) =>
              Effect.fail(new OrgDbError({ cause: memberDbError }))
            ),
            Effect.catchTag("MemberNotFoundError", (memberNotFoundError) =>
              Effect.fail(new OrgDbError({ cause: memberNotFoundError }))
            ),
            Effect.withSpan("CreateInvitationUseCase.create")
          );
        },
        get: (
          token: string // Accept token for validation
        ): Effect.Effect<Invitation, GetInvitationError | InvalidToken> => {
          return Effect.gen(function* () {
            const verifiedToken = yield* inviteToken.verify(token).pipe(
              Effect.mapError((error) => {
                return new OrgDbError({
                  cause: error,
                });
              })
            );

            const invitationId = verifiedToken.invitationId;

            if (!invitationId) {
              return yield* Effect.fail(
                new InvalidToken({
                  message: "Invalid token.",
                })
              );
            }

            // Retrieve the invitation using the invitationId and token
            const invitationOpt = yield* invitationRepo.getInvitation(
              invitationId
            );

            if (Option.isNone(invitationOpt)) {
              return yield* Effect.fail(
                new InvitationNotFound({
                  message: "Invitation not found.",
                })
              );
            }

            const invitation = invitationOpt.value;

            console.log("invitation checking DO service...", invitation);
            console.log("continue here....");

            if (invitation.status === "accepted") {
              return yield* Effect.fail(
                new InvitationAlreadyAccepted({
                  message: "Invitation has already been accepted.",
                  invitationId,
                })
              );
            }

            console.log(
              "invitation status checker....",
              invitation.status === "pending"
            );
            if (invitation.status === "revoked") {
              return yield* Effect.fail(
                new InvitationAlreadyRevoked({
                  message: "Invitation has been revoked.",
                  invitationId,
                })
              );
            }

            const isInvitationExpired = yield* Effect.gen(function* () {
              const currentTime = yield* Clock.currentTimeMillis;
              return invitation.expiresAt < currentTime;
            });

            console.log("isInvitationExpired", isInvitationExpired);

            if (isInvitationExpired) {
              return yield* Effect.fail(
                new InvitationExpired({
                  message: "Invitation has expired.",
                  invitationId,
                  expiredAt: new Date(invitation.expiresAt),
                })
              );
            }

            console.log("invitation status", invitation.status);

            if (invitation.status === "expired") {
              return yield* Effect.fail(
                new InvitationExpired({
                  message: "Invitation has expired.",
                  invitationId,
                  expiredAt: new Date(invitation.expiresAt),
                })
              );
            }

            console.log("invitation status", invitation.status);

            // At this point, invitation should be pending and not yet past its expiresAt time.
            if (invitation.status !== "pending") {
              return yield* Effect.fail(
                new InvitationNotFound({
                  message: `Invitation is in an invalid state: ${invitation.status}`,
                })
              );
            }

            console.log("invitation status", invitation.status);

            // update the invitation status to accepted
            // const updatedInvitation = yield* invitationRepo.updateStatus(
            //   invitationId,
            //   "accepted"
            // );

            // console.log("updatedInvitation", updatedInvitation);

            // return updatedInvitation; // Return the valid invitation
            return invitation;
          }).pipe(Effect.withSpan("GetInvitationUseCase.get"));
        },
      };
    })
  );
