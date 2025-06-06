import { Schema } from "effect";
import {
  OrganizationSlug,
  ShopDomain,
} from "@/domain/global/organization/models";
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
  CampaignSchema,
  CreateCampaignInputSchema,
} from "@/domain/tenant/campaigns/models";
import {
  SegmentSchema,
  CreateSegmentInputSchema,
  SegmentId,
} from "@/domain/tenant/segments/models";
import {
  CustomerSchema,
  CustomerId,
  CreateCustomerInputSchema,
  UpdateCustomerInputSchema,
} from "@/domain/tenant/customers/models";

// Extended schema for segments with customer count
const SegmentWithCustomerCountSchema = Schema.Struct({
  ...SegmentSchema.fields,
  customerCount: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0)
  ),
});

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

  // Create Campaign
  createCampaign: {
    request: CreateCampaignInputSchema,
    response: CampaignSchema,
  },

  // List Campaigns
  listCampaigns: {
    response: Schema.Struct({
      campaigns: Schema.Array(CampaignSchema),
      hasMore: Schema.Boolean,
      cursor: Schema.NullOr(Schema.String),
    }),
  },

  // Create Segment
  createSegment: {
    request: CreateSegmentInputSchema,
    response: SegmentSchema,
  },

  // List Segments
  listSegments: {
    response: Schema.Struct({
      segments: Schema.Array(SegmentWithCustomerCountSchema),
      hasMore: Schema.Boolean,
      cursor: Schema.NullOr(Schema.String),
    }),
  },

  // Get Segment
  getSegment: {
    path: Schema.Struct({
      segmentId: SegmentId,
    }),
    response: SegmentWithCustomerCountSchema,
  },

  // Create Customer
  createCustomer: {
    request: CreateCustomerInputSchema,
    response: CustomerSchema,
  },

  // List Customers
  listCustomers: {
    urlParams: Schema.Struct({
      limit: Schema.optional(Schema.NumberFromString),
      offset: Schema.optional(Schema.NumberFromString),
      status: Schema.optional(Schema.String),
    }),
    response: Schema.Struct({
      customers: Schema.Array(CustomerSchema),
      hasMore: Schema.Boolean,
      total: Schema.Number,
    }),
  },

  // Get Customer
  getCustomer: {
    path: Schema.Struct({
      customerId: CustomerId,
    }),
    response: CustomerSchema,
  },

  // Update Customer
  updateCustomer: {
    path: Schema.Struct({
      customerId: CustomerId,
    }),
    request: UpdateCustomerInputSchema,
    response: CustomerSchema,
  },

  // Delete Customer
  deleteCustomer: {
    path: Schema.Struct({
      customerId: CustomerId,
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
    }),
  },

  // Search Customers
  searchCustomers: {
    urlParams: Schema.Struct({
      query: Schema.optional(Schema.String),
      tags: Schema.optional(Schema.String), // comma-separated tags
      status: Schema.optional(Schema.String),
      limit: Schema.optional(Schema.NumberFromString),
      offset: Schema.optional(Schema.NumberFromString),
    }),
    response: Schema.Struct({
      customers: Schema.Array(CustomerSchema),
      hasMore: Schema.Boolean,
      total: Schema.Number,
    }),
  },

  // Add Customers to Segment
  addCustomersToSegment: {
    request: Schema.Struct({
      segmentId: SegmentId,
      customerIds: Schema.Array(CustomerId),
      source: Schema.optional(Schema.Literal("manual")),
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
      message: Schema.String,
      addedCount: Schema.Number,
    }),
  },

  // Remove Customers from Segment
  removeCustomersFromSegment: {
    request: Schema.Struct({
      segmentId: SegmentId,
      customerIds: Schema.Array(CustomerId),
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
      message: Schema.String,
      removedCount: Schema.Number,
    }),
  },

  // List Segment Customers
  listSegmentCustomers: {
    path: Schema.Struct({
      segmentId: SegmentId,
    }),
    urlParams: Schema.Struct({
      limit: Schema.optional(Schema.NumberFromString),
      offset: Schema.optional(Schema.NumberFromString),
    }),
    response: Schema.Struct({
      customers: Schema.Array(CustomerSchema),
      hasMore: Schema.Boolean,
      totalCount: Schema.Number,
    }),
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

export type CreateSegmentRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createSegment.request
>;
export type CreateSegmentResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createSegment.response
>;

export type ListSegmentsResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listSegments.response
>;

// Customer API Types
export type CreateCustomerRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createCustomer.request
>;
export type CreateCustomerResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.createCustomer.response
>;

export type ListCustomersUrlParams = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listCustomers.urlParams
>;
export type ListCustomersResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listCustomers.response
>;

export type SearchCustomersUrlParams = Schema.Schema.Type<
  typeof OrganizationApiSchemas.searchCustomers.urlParams
>;
export type SearchCustomersResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.searchCustomers.response
>;

// Segment-Customer API Types
export type AddCustomersToSegmentRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.addCustomersToSegment.request
>;
export type AddCustomersToSegmentResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.addCustomersToSegment.response
>;

export type RemoveCustomersFromSegmentRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.removeCustomersFromSegment.request
>;
export type RemoveCustomersFromSegmentResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.removeCustomersFromSegment.response
>;

export type ListSegmentCustomersPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listSegmentCustomers.path
>;
export type ListSegmentCustomersUrlParams = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listSegmentCustomers.urlParams
>;
export type ListSegmentCustomersResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.listSegmentCustomers.response
>;

export type GetCustomerPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getCustomer.path
>;
export type GetCustomerResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.getCustomer.response
>;

export type UpdateCustomerPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.updateCustomer.path
>;
export type UpdateCustomerRequest = Schema.Schema.Type<
  typeof OrganizationApiSchemas.updateCustomer.request
>;
export type UpdateCustomerResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.updateCustomer.response
>;

export type DeleteCustomerPath = Schema.Schema.Type<
  typeof OrganizationApiSchemas.deleteCustomer.path
>;
export type DeleteCustomerResponse = Schema.Schema.Type<
  typeof OrganizationApiSchemas.deleteCustomer.response
>;
