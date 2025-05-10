import { Layer, Schema as S } from "effect";
import { Context, type Effect } from "effect";
import type { User } from "../auth/model";
import type { Organization, OrganizationD1Schema } from "./model";

// === Errors ===
export class OrgNotFoundError extends S.TaggedError<OrgNotFoundError>()(
  "OrgNotFoundError",
  { orgId: S.String }, // Identify by orgId
) {}

// Placeholder for generic Org DB errors
export class OrgDbError extends S.TaggedError<OrgDbError>()(
  "OrgDbError",
  { cause: S.Unknown }, // Store the original cause
) {}

// Combined Error Type
export type OrgRepoError = OrgNotFoundError | OrgDbError;

// === Input Data Types ===

// Data needed to create an organization
// References the Organization schema where id is now S.String
export type OrgCreateData = typeof Organization.Type;

export type OrgD1CreateData = typeof OrganizationD1Schema.Type;

export class OrgD1Service extends Context.Tag("core/organization/OrgD1Service")<
  OrgD1Service,
  {
    insertOrgToMainDB: (
      org: Pick<OrgD1CreateData, "name" | "id">,
      creatorUserId: string,
    ) => Effect.Effect<OrgD1CreateData, OrgDbError>;
  }
>() {}

export class OrgService extends Context.Tag("core/organization/OrgService")<
  OrgService,
  {
    createOrg: (
      data: Pick<OrgCreateData, "name" | "slug" | "logo">,
      creatorUserId: string,
    ) => Effect.Effect<OrgCreateData, OrgDbError>;

    // Added getOrgById method
    getOrgById: (
      // Reference the imported Organization schema here too (id is S.String)
      id: OrgCreateData["id"],
    ) => Effect.Effect<OrgCreateData, OrgNotFoundError | OrgDbError>;

    getOrgByUserId: (
      userId: User["id"],
    ) => Effect.Effect<OrgCreateData, OrgNotFoundError | OrgDbError>;
  }
>() {}
