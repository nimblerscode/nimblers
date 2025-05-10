import { Schema as S } from "effect";
import { Context, type Effect } from "effect"; // Context is a value, Effect is a type
import type { Member, MemberSchema } from "./model"; // Import the schema now

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

export type MemberRepoError = MemberDbError | MemberNotFoundError;

// === Input/Output Data Types ===
// Define create data based on the schema type
// Define the return type explicitly

// === Member Repository Port ===
export class MemberRepo extends Context.Tag("core/member/MemberRepo")<
  MemberRepo,
  {
    // Create a membership record
    createMember: (data: Member) => Effect.Effect<Member, MemberDbError>;

    // Find membership by userId and organizationId
    findMembership: (
      userId: string,
      organizationId: string,
    ) => Effect.Effect<Member, MemberNotFoundError | MemberDbError>;

    // // Potentially add other methods like:
    // listMembersByOrg: (organizationId: string) => Effect.Effect<Member[], MemberDbError>;
    // updateMemberRole: (...) => Effect.Effect<Member, MemberRepoError>;
    // deleteMember: (...) => Effect.Effect<void, MemberRepoError>;
  }
>() {}
