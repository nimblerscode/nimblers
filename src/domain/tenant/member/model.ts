import { Schema as S } from "effect";
import { UserIdSchema } from "@/domain/global/user/model";
// Schema for Member based on schema.tenant.ts
export const NewMemberSchema = S.Struct({
  userId: UserIdSchema, // ID from the gateway's user table
  role: S.String, // e.g., 'owner', 'admin', 'member'
});

export const MemberSchema = S.Struct({
  id: S.String, // Typically a UUID or db-generated ID for the membership record itself
  userId: UserIdSchema, // Branded UserId from invitation models
  role: S.String, // Role of the user within the organization
  createdAt: S.Date,
});

export type Member = S.Schema.Type<typeof MemberSchema>;
export type NewMember = S.Schema.Type<typeof NewMemberSchema>;

// === Errors ===
// Placeholder for generic Member DB errors
export class MemberDbError extends S.TaggedError<MemberDbError>()(
  "MemberDbError",
  { cause: S.Unknown },
) {}

export class MemberNotFoundError extends S.TaggedError<MemberNotFoundError>()(
  "MemberNotFoundError",
  // Include relevant identifiers if needed, e.g., { userId: S.String, orgId: S.String }
  {},
) {}

export class MemberDOError extends S.TaggedError<MemberDOError>()(
  "MemberDOError",
  { cause: S.Unknown },
) {}

export type MemberRepoError = MemberDbError | MemberNotFoundError;
