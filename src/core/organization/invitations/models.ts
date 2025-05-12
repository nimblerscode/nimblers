import { Data, Schema as S } from "effect";
import type { GetInvitationError } from "./effects/getInvitation";
import type { UserError } from "@/core/user/models";
import type { OrgDbError } from "../service";
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
  InvitationStatusLiterals.revoked
);

export type InvitationStatus = S.Schema.Type<typeof InvitationStatusSchema>;

// --- Email Brand ---_ts
export const EmailSchema = S.String.pipe(
  S.trimmed(),
  S.filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
    message: (value) => `Invalid email format: ${value}`,
    identifier: "EmailFormat",
  }),
  S.brand("Email")
);
export type Email = S.Schema.Type<typeof EmailSchema>;

// --- Timestamp representation in Schema (as number) ---_ts
// Services/use-cases will handle Date <-> number conversion
const TimestampNumberSchema = S.Number;

// Branded IDs for better type safety
export const InvitationIdSchema = S.UUID.pipe(S.brand("InvitationId"));
export type InvitationId = S.Schema.Type<typeof InvitationIdSchema>;

export const OrganizationIdSchema = S.String.pipe(S.brand("OrganizationId"));
export type OrganizationId = S.Schema.Type<typeof OrganizationIdSchema>;

export const UserIdSchema = S.String.pipe(S.brand("UserId"));
export type UserId = S.Schema.Type<typeof UserIdSchema>;

export const Invitation = S.Struct({
  id: InvitationIdSchema,
  organizationId: OrganizationIdSchema,
  email: EmailSchema,
  inviterId: UserIdSchema,
  role: S.String, // Consider an enum/literal union if roles are predefined
  status: InvitationStatusSchema,
  expiresAt: TimestampNumberSchema,
  createdAt: TimestampNumberSchema,
  acceptedAt: S.optional(TimestampNumberSchema),
});

export type Invitation = S.Schema.Type<typeof Invitation>;
export type NewInvitation = Omit<
  Invitation,
  "id" | "createdAt" | "updatedAt" | "acceptedAt" | "expiresAt" // expiresAt is a number in schema, will be date in domain
> & { expiresAt: Date }; // Domain expects Date

// --- Invitation Errors ---_ts

export class InvitationNotFound extends Data.TaggedError("InvitationNotFound")<{
  message: string;
  invitationId: string;
}> {}

export class InvitationExpired extends Data.TaggedError("InvitationExpired")<{
  message: string;
  invitationId: string;
  expiredAt: Date;
}> {}

export class InvitationAlreadyAccepted extends Data.TaggedError(
  "InvitationAlreadyAccepted"
)<{ message: string; invitationId: string; acceptedAt: Date }> {}

export class InvitationAlreadyRevoked extends Data.TaggedError(
  "InvitationAlreadyRevoked"
)<{ message: string; invitationId: string }> {}

export class DuplicatePendingInvitation extends Data.TaggedError(
  "DuplicatePendingInvitation"
)<{ message: string; email: string; organizationId: string }> {}

export class MaxPendingInvitationsReached extends Data.TaggedError(
  "MaxPendingInvitationsReached"
)<{ message: string; organizationId: string; limit: number }> {}

export class UserAlreadyMember extends Data.TaggedError("UserAlreadyMember")<{
  message: string;
  userId: string;
  organizationId: string;
}> {}

export class InvalidInvitationStatusTransition extends Data.TaggedError(
  "InvalidInvitationStatusTransition"
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

// --- Input Schema for GetInvitation ---_ts
export const GetInvitationInput = S.Struct({
  organizationId: OrganizationIdSchema, // To verify against the found invitation
  invitationId: InvitationIdSchema,
});

export type GetInvitationInput = S.Schema.Type<typeof GetInvitationInput>;

// --- Input Schema for AcceptInvitation ---
export const AcceptInvitationInputSchema = S.Struct({
  invitationId: InvitationIdSchema,
  organizationId: OrganizationIdSchema, // To verify against the found invitation & for context
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
