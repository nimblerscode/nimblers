import { Schema as S } from "effect";

// Base schema for common fields (like ID and createdAt)
const BaseSchema = S.Struct({
  id: S.String, // Assuming IDs are strings (like UUIDs or CUIDs)
  // createdAt: S.String,
});

// Schema for Organization based on schema.tenant.ts
export const OrganizationSchema = S.Struct({
  ...BaseSchema.fields,
  name: S.String,
  slug: S.String,
  logo: S.optional(S.String), // Optional string
  metadata: S.optional(S.String), // Storing as string, parsing handled elsewhere if needed
});

export const OrganizationD1Schema = S.Struct({
  ...BaseSchema.fields,
  name: S.String,
  status: S.String,
  creatorId: S.String,
});

export interface Organization
  extends S.Schema.Type<typeof OrganizationSchema> {}
export const Organization = OrganizationSchema; // Exporting the schema itself for direct use

// Schema for the data required to create an organization
export const OrgCreateInputSchema = S.Struct({
  name: S.String.pipe(S.minLength(1)), // Ensure name is not empty
  slug: S.String.pipe(
    S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // Basic slug pattern (lowercase, numbers, hyphens)
    S.minLength(3), // Ensure slug has a minimum length
  ),
  logo: S.optional(S.String), // Optional logo URL
});

export interface OrgCreateInput
  extends S.Schema.Type<typeof OrgCreateInputSchema> {}

// Schema for Invitation based on schema.tenant.ts
export const InvitationSchema = S.Struct({
  ...BaseSchema.fields,
  email: S.String, // Consider refining with S.pattern for email format
  organizationId: S.String,
  inviterId: S.String, // ID from the gateway's user table
  role: S.String, // Consider S.Literal if roles are fixed
  status: S.String, // Consider S.Literal('pending', 'accepted', 'rejected', 'expired')
  expiresAt: S.DateFromSelf,
});
export interface Invitation extends S.Schema.Type<typeof InvitationSchema> {}
export const Invitation = InvitationSchema;
