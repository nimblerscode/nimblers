import { Context, type Effect, type Option } from "effect";
import type { Email } from "@/domain/global/email/model";
import type {
  Member,
  MemberDbError,
  MemberDOError,
  MemberNotFoundError,
  NewMember,
} from "./model"; // Import the schema now
import type { OrganizationSlug } from "@/domain/global/organization/models";

// === Member Repository Port ===
export class MemberRepo extends Context.Tag("core/member/MemberRepo")<
  MemberRepo,
  {
    // Create a membership record
    createMember: (data: NewMember) => Effect.Effect<Member, MemberDbError>;

    // // Find membership by userId and organizationId
    readonly findMembership: (
      email: Email
    ) => Effect.Effect<
      Option.Option<Member>,
      MemberNotFoundError | MemberDbError
    >;

    readonly getMembers: Effect.Effect<Member[], MemberDbError>;
  }
>() {}

export class MemberDOService extends Context.Tag("core/member/MemberDOService")<
  MemberDOService,
  {
    readonly get: (
      slug: OrganizationSlug
    ) => Effect.Effect<Member[], MemberDOError>;
  }
>() {}
