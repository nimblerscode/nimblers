import { Schema as S } from "effect";
import { OrganizationIdSchema } from "@/domain/tenant/organization/model";
import { UserIdSchema } from "../user/model";

export const OrganizationD1Schema = S.Struct({
  id: OrganizationIdSchema,
  slug: S.String,
  status: S.String,
  creatorId: UserIdSchema,
});

export type OrganizationD1 = S.Schema.Type<typeof OrganizationD1Schema>;

export const NewOrganizationD1Schema = S.Struct({
  id: OrganizationIdSchema,
  slug: S.String,
  creatorId: UserIdSchema,
});

export type NewOrganizationD1 = S.Schema.Type<typeof NewOrganizationD1Schema>;

// Organization with membership information (from D1 database)
export const OrganizationWithMembershipSchema = S.Struct({
  id: S.String,
  slug: S.String,
  status: S.String,
  role: S.String,
  createdAt: S.String,
});

export type OrganizationWithMembership = S.Schema.Type<
  typeof OrganizationWithMembershipSchema
>;

// Organization with membership and name (includes data from Durable Object)
export const OrganizationWithMembershipAndNameSchema = S.Struct({
  id: S.String,
  slug: S.String,
  name: S.String,
  status: S.String,
  role: S.String,
  createdAt: S.String,
});

export type OrganizationWithMembershipAndName = S.Schema.Type<
  typeof OrganizationWithMembershipAndNameSchema
>;

// === Errors ===
export class OrgDbError extends S.TaggedError<OrgDbError>()(
  "OrgDbError",
  { cause: S.Unknown } // Store the original cause
) {}

export class OrgNotFoundError extends S.TaggedError<OrgNotFoundError>()(
  "OrgNotFoundError",
  { cause: S.Unknown } // Store the original cause
) {}
