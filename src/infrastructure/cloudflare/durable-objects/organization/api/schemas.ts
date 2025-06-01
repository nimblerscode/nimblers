import { Schema } from "effect";
import { UserIdSchema } from "@/domain/global/user/model";
import {
  InvitationSchema,
  NewInvitationSchema,
} from "@/domain/tenant/invitations/models";
import { MemberSchema } from "@/domain/tenant/member/model";
import {
  NewOrganizationSchema,
  OrganizationSchema,
} from "@/domain/tenant/organization/model";
import {
  OrganizationSlug,
  ShopDomain,
} from "@/domain/global/organization/models";

/**
 * Shared API schemas for Organization Durable Object
 *
 * These schemas are used by both:
 * 1. API handlers (HttpApiEndpoint definitions)
 * 2. Type-safe DO clients
 *
 * This ensures type consistency between client and server.
 */

// Request/Response schemas for each endpoint
export const OrganizationApiSchemas = {
  // Create Organization
  createOrganization: {
    request: Schema.Struct({
      organization: NewOrganizationSchema,
      userId: UserIdSchema,
    }),
    response: OrganizationSchema,
  },

  // Get Organization
  getOrganization: {
    path: Schema.Struct({
      organizationSlug: OrganizationSlug,
    }),
    response: OrganizationSchema,
  },

  // Create Invitation
  createInvitation: {
    request: Schema.Struct({
      newInvitation: NewInvitationSchema,
    }),
    response: Schema.Struct({
      invitation: InvitationSchema,
    }),
  },

  // Get Invitation
  getInvitation: {
    path: Schema.Struct({
      organizationSlug: OrganizationSlug,
    }),
    urlParams: Schema.Struct({
      token: Schema.String,
    }),
    response: InvitationSchema,
  },

  // Accept Invitation
  acceptInvitation: {
    path: Schema.Struct({
      id: Schema.String,
    }),
    request: Schema.Struct({
      token: Schema.String,
      userId: UserIdSchema,
    }),
    response: Schema.Struct({
      ok: Schema.Boolean,
    }),
  },

  // Get Members
  getMembers: {
    path: Schema.Struct({
      organizationSlug: OrganizationSlug,
    }),
    response: Schema.Array(MemberSchema),
  },

  // Get Invitations
  getInvitations: {
    response: Schema.Array(InvitationSchema),
  },

  // Connect Store
  connectStore: {
    request: Schema.Struct({
      type: Schema.Literal("shopify"),
      shopDomain: Schema.String,
      organizationSlug: OrganizationSlug,
    }),
    response: Schema.Struct({
      id: Schema.String,
      shopDomain: Schema.String,
      status: Schema.String,
    }),
  },

  // Disconnect Store
  disconnectStore: {
    path: Schema.Struct({
      shopDomain: ShopDomain,
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
    }),
  },

  // Get Connected Stores
  getConnectedStores: {
    path: Schema.Struct({
      organizationSlug: OrganizationSlug,
    }),
    response: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        organizationId: Schema.String,
        type: Schema.Literal("shopify"),
        shopDomain: Schema.String,
        scope: Schema.NullOr(Schema.String),
        status: Schema.Union(
          Schema.Literal("active"),
          Schema.Literal("disconnected"),
          Schema.Literal("error")
        ),
        connectedAt: Schema.Date,
        lastSyncAt: Schema.NullOr(Schema.Date),
        metadata: Schema.NullOr(Schema.String),
        createdAt: Schema.Date,
      })
    ),
  },
} as const;

// Type exports for use in implementations
export type CreateOrganizationRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createOrganization.request
>;
export type CreateOrganizationResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createOrganization.response
>;

export type GetOrganizationPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getOrganization.path
>;
export type GetOrganizationResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getOrganization.response
>;

export type CreateInvitationRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createInvitation.request
>;
export type CreateInvitationResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createInvitation.response
>;

export type GetInvitationPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getInvitation.path
>;
export type GetInvitationUrlParams = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getInvitation.urlParams
>;
export type GetInvitationResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getInvitation.response
>;

export type AcceptInvitationPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.acceptInvitation.path
>;
export type AcceptInvitationRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.acceptInvitation.request
>;
export type AcceptInvitationResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.acceptInvitation.response
>;

export type GetMembersPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getMembers.path
>;
export type GetMembersResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getMembers.response
>;

export type GetInvitationsResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getInvitations.response
>;
