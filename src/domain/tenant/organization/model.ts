import { Schema as S } from "effect";

export const OrganizationIdSchema = S.String.pipe(S.brand("OrganizationId"));

// Connected Store Schema
export const ConnectedStoreSchema = S.Struct({
  id: S.String,
  organizationId: OrganizationIdSchema,
  type: S.Literal("shopify"), // Can expand to S.Union("shopify", "woocommerce") later
  shopDomain: S.String,
  scope: S.NullOr(S.String),
  status: S.Union(
    S.Literal("active"),
    S.Literal("disconnected"),
    S.Literal("error")
  ),
  connectedAt: S.Date,
  lastSyncAt: S.NullOr(S.Date),
  metadata: S.NullOr(S.String), // JSON string
  createdAt: S.Date,
});

// Schema for Organization based on schema.tenant.ts
export const OrganizationSchema = S.Struct({
  id: OrganizationIdSchema,
  name: S.String,
  slug: S.String,
  logo: S.NullOr(S.String), // Optional string
  metadata: S.NullOr(S.String),
  createdAt: S.Date,
});

// Organization with connected stores
export const OrganizationWithStoresSchema = S.Struct({
  ...OrganizationSchema.fields,
  connectedStores: S.Array(ConnectedStoreSchema),
});

// Type exports
export type OrganizationId = S.Schema.Type<typeof OrganizationIdSchema>;
export type ConnectedStore = S.Schema.Type<typeof ConnectedStoreSchema>;
export type Organization = S.Schema.Type<typeof OrganizationSchema>;
export type OrganizationWithStores = S.Schema.Type<
  typeof OrganizationWithStoresSchema
>;

export type NewConnectedStore = Omit<ConnectedStore, "id" | "createdAt">;

// Schema for the data required to create an organization
export const NewOrganizationSchema = S.Struct({
  name: S.String.pipe(S.minLength(1)), // Ensure name is not empty
  slug: S.String.pipe(
    S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // Basic slug pattern (lowercase, numbers, hyphens)
    S.minLength(3) // Ensure slug has a minimum length
  ),
  logo: S.optional(S.String), // Optional logo URL
});

export interface NewOrganization
  extends S.Schema.Type<typeof NewOrganizationSchema> {}

// Placeholder for generic Org DB errors
export class OrgDbError extends S.TaggedError<OrgDbError>()(
  "OrgDbError",
  { cause: S.Unknown } // Store the original cause
) {}
