import { Data, Schema as S } from "effect";
import { EmailSchema } from "@/domain/global/email/model";
import type { UserError, UserId } from "@/domain/global/user/model";
import { UserIdSchema } from "@/domain/global/user/model";
import {
  type OrganizationId,
  OrganizationIdSchema,
  type OrgDbError,
} from "@/domain/tenant/organization/model";

export const InvitationStatusLiterals = {
  pending: S.Literal("pending"),
  accepted: S.Literal("accepted"),
  expired: S.Literal("expired"),
  revoked: S.Literal("revoked"),
} as const;

export const InvitationStatusSchema = S.Union(
  InvitationStatusLiterals.pending,
  InvitationStatusLiterals.accepted,
  InvitationStatusLiterals.expired,
  InvitationStatusLiterals.revoked,
);

export type InvitationStatus = S.Schema.Type<typeof InvitationStatusSchema>;
export type GetInvitationError = InvitationError | OrgDbError;

// --- Timestamp representation in Schema (as number) ---_ts
// Services/use-cases will handle Date <-> number conversion
const TimestampNumberSchema = S.Number;

// Branded IDs for better type safety
export const InvitationIdSchema = S.UUID.pipe(S.brand("InvitationId"));
export type InvitationId = S.Schema.Type<typeof InvitationIdSchema>;

export const InvitationSchema = S.Struct({
  id: InvitationIdSchema,
  email: EmailSchema,
  inviterId: UserIdSchema,
  role: S.String, // Consider an enum/literal union if roles are predefined
  status: InvitationStatusSchema,
  expiresAt: TimestampNumberSchema,
  createdAt: TimestampNumberSchema,
});

export type Invitation = S.Schema.Type<typeof InvitationSchema>;

export const NewInvitationSchema = S.Struct({
  inviterId: UserIdSchema,
  inviteeEmail: EmailSchema,
  role: S.String,
});

export type NewInvitation = S.Schema.Type<typeof NewInvitationSchema>;

// --- Invitation Errors ---_ts

export class InvitationNotFound extends Data.TaggedError("InvitationNotFound")<{
  message: string;
}> {}

export class InvalidToken extends Data.TaggedError("InvalidToken")<{
  message: string;
}> {}

export class InvitationExpired extends Data.TaggedError("InvitationExpired")<{
  message: string;
  invitationId: InvitationId;
  expiredAt: Date;
}> {}

export class InvitationAlreadyAccepted extends Data.TaggedError(
  "InvitationAlreadyAccepted",
)<{ message: string; invitationId: string }> {}

export class InvitationAlreadyRevoked extends Data.TaggedError(
  "InvitationAlreadyRevoked",
)<{ message: string; invitationId: string }> {}

export class DuplicatePendingInvitation extends Data.TaggedError(
  "DuplicatePendingInvitation",
)<{ message: string; email: string }> {}

export class MaxPendingInvitationsReached extends Data.TaggedError(
  "MaxPendingInvitationsReached",
)<{ message: string; organizationId: OrganizationId; limit: number }> {}

export class UserAlreadyMember extends Data.TaggedError("UserAlreadyMember")<{
  message: string;
  userId: UserId;
}> {}

export class InvalidInvitationStatusTransition extends Data.TaggedError(
  "InvalidInvitationStatusTransition",
)<{
  message: string;
  invitationId: string;
  currentStatus: InvitationStatus;
  targetStatus: InvitationStatus;
}> {}

export type InvitationError =
  | InvitationNotFound
  | InvitationExpired
  | InvitationAlreadyAccepted
  | InvitationAlreadyRevoked
  | DuplicatePendingInvitation
  | MaxPendingInvitationsReached
  | UserAlreadyMember
  | InvalidInvitationStatusTransition;

// --- Input Schema for AcceptInvitation ---
export const AcceptInvitationInputSchema = S.Struct({
  token: S.String,
});

export type AcceptInvitationInput = S.Schema.Type<
  typeof AcceptInvitationInputSchema
>;

// Define a combined error type for this use case
export type AcceptInvitationError =
  | GetInvitationError // Errors from GetInvitationUseCase
  | OrgDbError
  | UserError // Errors from UserRepo (e.g., user creation failed)
  | InvitationError; // Specific errors like "InvitationAlreadyProcessed" if not covered by GetInvitation

// --- Input Schema for CreateInvitation ---_ts
export const CreateInvitationInputSchema = S.Struct({
  organizationId: OrganizationIdSchema,
  inviterId: UserIdSchema,
  inviteeEmail: EmailSchema,
  role: S.String,
});

export type CreateInvitationInput = S.Schema.Type<
  typeof CreateInvitationInputSchema
>;

export const FindPendingByEmailInputSchema = S.Struct({
  email: EmailSchema,
});

export type FindPendingByEmailInput = S.Schema.Type<
  typeof FindPendingByEmailInputSchema
>;
