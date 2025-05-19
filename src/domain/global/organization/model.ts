import { Schema as S } from "effect";
import { OrganizationIdSchema } from "@/domain/tenant/organization/model";
import { UserIdSchema } from "../user/model";

export const OrganizationD1Schema = S.Struct({
  id: OrganizationIdSchema,
  name: S.String,
  status: S.String,
  creatorId: UserIdSchema,
});

export type OrganizationD1 = S.Schema.Type<typeof OrganizationD1Schema>;

export const NewOrganizationD1Schema = S.Struct({
  id: OrganizationIdSchema,
  name: S.String,
  creatorId: UserIdSchema,
});

export type NewOrganizationD1 = S.Schema.Type<typeof NewOrganizationD1Schema>;

// === Errors ===
export class OrgDbError extends S.TaggedError<OrgDbError>()(
  "OrgDbError",
  { cause: S.Unknown }, // Store the original cause
) {}

export class OrgNotFoundError extends S.TaggedError<OrgNotFoundError>()(
  "OrgNotFoundError",
  { cause: S.Unknown }, // Store the original cause
) {}
