import { Context, type Effect, type Option } from "effect";
import type { Email } from "@/domain/global/email/model";
import type {
  Member,
  MemberDbError,
  MemberNotFoundError,
  NewMember,
} from "./model"; // Import the schema now

// === Member Repository Port ===
export class MemberRepo extends Context.Tag("core/member/MemberRepo")<
  MemberRepo,
  {
    // Create a membership record
    createMember: (data: NewMember) => Effect.Effect<Member, MemberDbError>;

    // // Find membership by userId and organizationId
    findMembership: (
      email: Email,
    ) => Effect.Effect<
      Option.Option<Member>,
      MemberNotFoundError | MemberDbError
    >;

    // // Potentially add other methods like:
    // listMembersByOrg: (organizationId: string) => Effect.Effect<Member[], MemberDbError>;
    // updateMemberRole: (...) => Effect.Effect<Member, MemberRepoError>;
    // deleteMember: (...) => Effect.Effect<void, MemberRepoError>;
  }
>() {}
