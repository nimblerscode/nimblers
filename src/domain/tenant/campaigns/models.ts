import { Data, Schema as S } from "effect";
import {
  CampaignId,
  SegmentId,
  ConversationId,
  PhoneNumber,
  Timezone,
  type CampaignId as CampaignIdType,
  type SegmentId as SegmentIdType,
  type ConversationId as ConversationIdType,
  type PhoneNumber as PhoneNumberType,
  type Timezone as TimezoneType,
} from "@/domain/tenant/shared/branded-types";

// Re-export branded types for convenience
export type {
  CampaignIdType as CampaignId,
  SegmentIdType as SegmentId,
  ConversationIdType as ConversationId,
  PhoneNumberType as PhoneNumber,
  TimezoneType as Timezone,
};

// === Campaign Enums ===
export const CampaignStatus = S.Union(
  S.Literal("draft"),
  S.Literal("scheduled"),
  S.Literal("active"),
  S.Literal("paused"),
  S.Literal("completed"),
  S.Literal("cancelled")
);
export type CampaignStatus = S.Schema.Type<typeof CampaignStatus>;

export const CampaignType = S.Union(
  S.Literal("sms"),
  S.Literal("email"),
  S.Literal("whatsapp"),
  S.Literal("push_notification")
);
export type CampaignType = S.Schema.Type<typeof CampaignType>;

// === Campaign Execution Tracking (timestamps only) ===
export const CampaignExecution = S.Struct({
  campaignSentAt: S.optional(S.Date),
  estimatedDeliveryTime: S.optional(S.Date),
});
export type CampaignExecution = S.Schema.Type<typeof CampaignExecution>;

// === Campaign Scheduling ===
export const CampaignSchedule = S.Struct({
  scheduledAt: S.optional(S.Date),
  timezone: Timezone,
  startedAt: S.optional(S.Date),
  completedAt: S.optional(S.Date),
});
export type CampaignSchedule = S.Schema.Type<typeof CampaignSchedule>;

// === Campaign Settings ===
export const CampaignSettings = S.Struct({
  rateLimitPerMinute: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
  maxRetries: S.optional(S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0))),
  enableDeliveryTracking: S.optional(S.Boolean),
  enableConversations: S.optional(S.Boolean), // Whether to create conversation DOs for replies
});
export type CampaignSettings = S.Schema.Type<typeof CampaignSettings>;

// === Main Campaign Schema ===
export const CampaignSchema = S.Struct({
  id: CampaignId,
  name: S.String.pipe(S.minLength(1), S.maxLength(255)),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  campaignType: CampaignType,
  status: CampaignStatus,
  schedule: CampaignSchedule,
  segmentIds: S.Array(SegmentId),
  execution: CampaignExecution,
  settings: S.optional(CampaignSettings),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  createdAt: S.Date,
  updatedAt: S.Date,
});
export type Campaign = S.Schema.Type<typeof CampaignSchema>;

// === Campaign Creation Input ===
export const CreateCampaignInputSchema = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(255)),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  campaignType: CampaignType,
  scheduledAt: S.optional(S.Date),
  timezone: Timezone,
  segmentIds: S.Array(SegmentId),
  settings: S.optional(CampaignSettings),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CreateCampaignInput = S.Schema.Type<
  typeof CreateCampaignInputSchema
>;

// === Campaign Update Input ===
export const UpdateCampaignInputSchema = S.Struct({
  name: S.optional(S.String.pipe(S.minLength(1), S.maxLength(255))),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  status: S.optional(CampaignStatus),
  scheduledAt: S.optional(S.Date),
  timezone: S.optional(Timezone),
  segmentIds: S.optional(S.Array(SegmentId)),
  settings: S.optional(CampaignSettings),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type UpdateCampaignInput = S.Schema.Type<
  typeof UpdateCampaignInputSchema
>;

// === Campaign Execution Input ===
export const ExecuteCampaignInputSchema = S.Struct({
  campaignId: CampaignId,
  executeAt: S.optional(S.Date), // Override scheduled time if needed
  dryRun: S.optional(S.Boolean), // Test run without actually sending
});
export type ExecuteCampaignInput = S.Schema.Type<
  typeof ExecuteCampaignInputSchema
>;

// === Campaign Analytics (calculated on-demand) ===
export const CampaignAnalyticsSchema = S.Struct({
  campaignId: CampaignId,
  targetCustomerCount: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)), // Calculated from segments
  conversationsCreated: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)), // Count of conversation DOs
  totalMessagesSent: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)), // Aggregated from conversations
  lastCalculatedAt: S.Date,
});
export type CampaignAnalytics = S.Schema.Type<typeof CampaignAnalyticsSchema>;

// === Campaign-Conversation Relationship ===
export const ConversationStatus = S.Union(
  S.Literal("active"),
  S.Literal("paused"),
  S.Literal("resolved"),
  S.Literal("archived")
);
export type ConversationStatus = S.Schema.Type<typeof ConversationStatus>;

export const CampaignConversationSchema = S.Struct({
  id: S.String,
  campaignId: CampaignId,
  conversationId: ConversationId,
  customerPhone: PhoneNumber,
  conversationStatus: ConversationStatus,
  lastMessageAt: S.optional(S.Date),
  messageCount: S.optional(S.String), // Snapshot from conversation DO (can be stale)
  createdAt: S.Date,
  updatedAt: S.Date,
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CampaignConversation = S.Schema.Type<
  typeof CampaignConversationSchema
>;

// === Campaign-Conversation Operations ===
export const CreateCampaignConversationInputSchema = S.Struct({
  campaignId: CampaignId,
  conversationId: ConversationId,
  customerPhone: PhoneNumber,
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CreateCampaignConversationInput = S.Schema.Type<
  typeof CreateCampaignConversationInputSchema
>;

export const UpdateCampaignConversationInputSchema = S.Struct({
  conversationStatus: S.optional(ConversationStatus),
  lastMessageAt: S.optional(S.Date),
  messageCount: S.optional(S.String),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type UpdateCampaignConversationInput = S.Schema.Type<
  typeof UpdateCampaignConversationInputSchema
>;

// === Campaign Conversation List Input ===
export const ListCampaignConversationsInputSchema = S.Struct({
  campaignId: CampaignId,
  status: S.optional(ConversationStatus),
  limit: S.optional(
    S.Number.pipe(S.int(), S.greaterThan(0), S.lessThanOrEqualTo(100))
  ),
  offset: S.optional(S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0))),
});
export type ListCampaignConversationsInput = S.Schema.Type<
  typeof ListCampaignConversationsInputSchema
>;

// === Error Types ===
export class CampaignNotFoundError extends Data.TaggedError(
  "CampaignNotFoundError"
)<{
  readonly campaignId: CampaignId;
  readonly message: string;
}> {}

export class CampaignInvalidStatusError extends Data.TaggedError(
  "CampaignInvalidStatusError"
)<{
  readonly campaignId: CampaignId;
  readonly currentStatus: CampaignStatus;
  readonly requestedStatus: CampaignStatus;
  readonly message: string;
}> {}

export class CampaignSchedulingError extends Data.TaggedError(
  "CampaignSchedulingError"
)<{
  readonly campaignId: CampaignId;
  readonly scheduledAt: Date;
  readonly message: string;
}> {}

export class CampaignValidationError extends Data.TaggedError(
  "CampaignValidationError"
)<{
  readonly message: string;
  readonly issues: readonly string[];
}> {}

export class CampaignDbError extends Data.TaggedError("CampaignDbError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// === Business Rule Errors ===
export class EmptySegmentListError extends Data.TaggedError(
  "EmptySegmentListError"
)<{
  readonly campaignId: CampaignId;
  readonly message: string;
}> {}

export class CampaignAlreadyExecutedError extends Data.TaggedError(
  "CampaignAlreadyExecutedError"
)<{
  readonly campaignId: CampaignId;
  readonly status: CampaignStatus;
  readonly executedAt: Date;
  readonly message: string;
}> {}

export class CampaignExecutionError extends Data.TaggedError(
  "CampaignExecutionError"
)<{
  readonly campaignId: CampaignId;
  readonly reason: string;
  readonly message: string;
}> {}

export class ConversationNotFoundError extends Data.TaggedError(
  "ConversationNotFoundError"
)<{
  readonly conversationId: ConversationId;
  readonly message: string;
}> {}

export class ConversationSyncError extends Data.TaggedError(
  "ConversationSyncError"
)<{
  readonly conversationId: ConversationId;
  readonly campaignId: CampaignId;
  readonly message: string;
}> {}

// === Union Type for All Campaign Errors ===
export type CampaignError =
  | CampaignNotFoundError
  | CampaignInvalidStatusError
  | CampaignSchedulingError
  | CampaignValidationError
  | CampaignDbError
  | EmptySegmentListError
  | CampaignAlreadyExecutedError
  | CampaignExecutionError
  | ConversationNotFoundError
  | ConversationSyncError;

// === Status Transition Rules ===
export const VALID_STATUS_TRANSITIONS: Record<
  CampaignStatus,
  readonly CampaignStatus[]
> = {
  draft: ["scheduled", "active", "cancelled"],
  scheduled: ["active", "paused", "cancelled"],
  active: ["paused", "completed", "cancelled"],
  paused: ["active", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
} as const;

// === Campaign Type Configuration ===
export const CAMPAIGN_TYPE_CONFIG: Record<
  CampaignType,
  {
    supportsScheduling: boolean;
    createsConversations: boolean; // Whether this type creates conversation DOs
    requiresSegments: boolean;
  }
> = {
  sms: {
    supportsScheduling: true,
    createsConversations: true, // SMS enables replies
    requiresSegments: true,
  },
  email: {
    supportsScheduling: true,
    createsConversations: false, // Typically one-way
    requiresSegments: true,
  },
  whatsapp: {
    supportsScheduling: true,
    createsConversations: true, // WhatsApp enables conversations
    requiresSegments: true,
  },
  push_notification: {
    supportsScheduling: true,
    createsConversations: false, // Typically one-way
    requiresSegments: true,
  },
} as const;
