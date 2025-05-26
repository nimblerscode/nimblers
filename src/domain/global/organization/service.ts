import { Context, type Effect } from "effect";
import type { UserId } from "../user/model";
import type {
  NewOrganizationD1,
  OrganizationD1,
  OrganizationWithMembership,
  OrgDbError,
} from "./model";

// === Organization D1 Repository ===
export abstract class OrgD1Repo extends Context.Tag("@core/OrgD1Repo")<
  OrgD1Repo,
  {
    readonly create: (
      organization: NewOrganizationD1,
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgIdBySlug: (
      slug: string,
      userId: UserId,
    ) => Effect.Effect<string, OrgDbError>;
    readonly getOrganizationsForUser: (
      userId: UserId,
    ) => Effect.Effect<OrganizationWithMembership[], OrgDbError>;
  }
>() {}

// === Organization D1 Service ===
export abstract class OrgD1Service extends Context.Tag("@core/OrgD1Service")<
  OrgD1Service,
  {
    readonly create: (
      organization: NewOrganizationD1,
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgIdBySlug: (
      slug: string,
      userId: UserId,
    ) => Effect.Effect<string, OrgDbError>;
    readonly getOrganizationsForUser: (
      userId: UserId,
    ) => Effect.Effect<OrganizationWithMembership[], OrgDbError>;
  }
>() {}
