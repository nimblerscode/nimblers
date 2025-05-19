import { Schema as S } from "effect";

export const OrganizationIdSchema = S.UUID.pipe(S.brand("OrganizationId"));
export type OrganizationId = S.Schema.Type<typeof OrganizationIdSchema>;

// Schema for Organization based on schema.tenant.ts
export const OrganizationSchema = S.Struct({
  id: OrganizationIdSchema,
  name: S.String,
  slug: S.String,
  logo: S.NullOr(S.String), // Optional string
  metadata: S.NullOr(S.String),
});

export interface Organization
  extends S.Schema.Type<typeof OrganizationSchema> {}

// Schema for the data required to create an organization
export const NewOrganizationSchema = S.Struct({
  name: S.String.pipe(S.minLength(1)), // Ensure name is not empty
  slug: S.String.pipe(
    S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // Basic slug pattern (lowercase, numbers, hyphens)
    S.minLength(3), // Ensure slug has a minimum length
  ),
  logo: S.optional(S.String), // Optional logo URL
});

export interface NewOrganization
  extends S.Schema.Type<typeof NewOrganizationSchema> {}

// Placeholder for generic Org DB errors
export class OrgDbError extends S.TaggedError<OrgDbError>()(
  "OrgDbError",
  { cause: S.Unknown }, // Store the original cause
) {}
