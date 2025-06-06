import { Schema } from "effect";
import { Effect } from "effect";
import { Data } from "effect";

// === Core ID Types ===
export const ConversationId = Schema.String.pipe(
  Schema.brand("ConversationId")
);
export type ConversationId = Schema.Schema.Type<typeof ConversationId>;

export const MessageId = Schema.String.pipe(Schema.brand("MessageId"));
export type MessageId = Schema.Schema.Type<typeof MessageId>;

export const CampaignId = Schema.String.pipe(Schema.brand("CampaignId"));
export type CampaignId = Schema.Schema.Type<typeof CampaignId>;

export const SegmentId = Schema.String.pipe(Schema.brand("SegmentId"));
export type SegmentId = Schema.Schema.Type<typeof SegmentId>;

export const CampaignSegmentId = Schema.String.pipe(
  Schema.brand("CampaignSegmentId")
);
export type CampaignSegmentId = Schema.Schema.Type<typeof CampaignSegmentId>;

export const EventId = Schema.String.pipe(Schema.brand("EventId"));
export type EventId = Schema.Schema.Type<typeof EventId>;

// === Contact Information ===
export const PhoneNumber = Schema.String.pipe(
  Schema.pattern(/^\+?[1-9]\d{1,14}$/), // E.164 format
  Schema.brand("PhoneNumber")
);
export type PhoneNumber = Schema.Schema.Type<typeof PhoneNumber>;

// === Organization ===
export const OrganizationSlug = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9-]+$/),
  Schema.brand("OrganizationSlug")
);
export type OrganizationSlug = Schema.Schema.Type<typeof OrganizationSlug>;

// === Content Types ===
export const MessageContent = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("MessageContent")
);
export type MessageContent = Schema.Schema.Type<typeof MessageContent>;

export const MessageType = Schema.String.pipe(Schema.brand("MessageType"));
export type MessageType = Schema.Schema.Type<typeof MessageType>;

export const EventType = Schema.String.pipe(Schema.brand("EventType"));
export type EventType = Schema.Schema.Type<typeof EventType>;

// === External References ===
export const ExternalMessageId = Schema.String.pipe(
  Schema.brand("ExternalMessageId")
);
export type ExternalMessageId = Schema.Schema.Type<typeof ExternalMessageId>;

export const Provider = Schema.String.pipe(Schema.brand("Provider"));
export type Provider = Schema.Schema.Type<typeof Provider>;

// === Pagination ===
export const Cursor = Schema.String.pipe(Schema.brand("Cursor"));
export type Cursor = Schema.Schema.Type<typeof Cursor>;

// === Timezone ===
export const Timezone = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("Timezone")
);
export type Timezone = Schema.Schema.Type<typeof Timezone>;

// === Roles ===
export const MemberRole = Schema.String.pipe(Schema.brand("MemberRole"));
export type MemberRole = Schema.Schema.Type<typeof MemberRole>;

export const UserRole = Schema.String.pipe(Schema.brand("UserRole"));
export type UserRole = Schema.Schema.Type<typeof UserRole>;

// === Text Content ===
export const EventDescription = Schema.String.pipe(
  Schema.brand("EventDescription")
);
export type EventDescription = Schema.Schema.Type<typeof EventDescription>;

export const FailureReason = Schema.String.pipe(Schema.brand("FailureReason"));
export type FailureReason = Schema.Schema.Type<typeof FailureReason>;

// === JSON Metadata ===
export const JsonMetadata = Schema.String.pipe(Schema.brand("JsonMetadata"));
export type JsonMetadata = Schema.Schema.Type<typeof JsonMetadata>;

// === Validation Errors ===
export class BrandedTypeValidationError extends Data.TaggedError(
  "BrandedTypeValidationError"
)<{
  type: string;
  value: string;
  reason: string;
}> {}

// === Constructor Functions ===
// These functions safely create branded types with validation

export const makeConversationId = (
  value: string
): Effect.Effect<ConversationId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(ConversationId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "ConversationId",
        value,
        reason: String(error),
      }),
  });

export const makeMessageId = (
  value: string
): Effect.Effect<MessageId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(MessageId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "MessageId",
        value,
        reason: String(error),
      }),
  });

export const makeCampaignId = (
  value: string
): Effect.Effect<CampaignId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(CampaignId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "CampaignId",
        value,
        reason: String(error),
      }),
  });

export const makePhoneNumber = (
  value: string
): Effect.Effect<PhoneNumber, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(PhoneNumber)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "PhoneNumber",
        value,
        reason: String(error),
      }),
  });

export const makeOrganizationSlug = (
  value: string
): Effect.Effect<OrganizationSlug, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(OrganizationSlug)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "OrganizationSlug",
        value,
        reason: String(error),
      }),
  });

export const makeMessageContent = (
  value: string
): Effect.Effect<MessageContent, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(MessageContent)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "MessageContent",
        value,
        reason: String(error),
      }),
  });

export const makeMessageType = (
  value: string
): Effect.Effect<MessageType, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(MessageType)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "MessageType",
        value,
        reason: String(error),
      }),
  });

export const makeEventType = (
  value: string
): Effect.Effect<EventType, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(EventType)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "EventType",
        value,
        reason: String(error),
      }),
  });

export const makeProvider = (
  value: string
): Effect.Effect<Provider, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(Provider)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "Provider",
        value,
        reason: String(error),
      }),
  });

export const makeCursor = (
  value: string
): Effect.Effect<Cursor, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(Cursor)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "Cursor",
        value,
        reason: String(error),
      }),
  });

export const makeTimezone = (
  value: string
): Effect.Effect<Timezone, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(Timezone)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "Timezone",
        value,
        reason: String(error),
      }),
  });

export const makeMemberRole = (
  value: string
): Effect.Effect<MemberRole, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(MemberRole)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "MemberRole",
        value,
        reason: String(error),
      }),
  });

export const makeEventId = (
  value: string
): Effect.Effect<EventId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(EventId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "EventId",
        value,
        reason: String(error),
      }),
  });

export const makeCampaignSegmentId = (
  value: string
): Effect.Effect<CampaignSegmentId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(CampaignSegmentId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "CampaignSegmentId",
        value,
        reason: String(error),
      }),
  });

export const makeExternalMessageId = (
  value: string
): Effect.Effect<ExternalMessageId, BrandedTypeValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(ExternalMessageId)(value),
    catch: (error) =>
      new BrandedTypeValidationError({
        type: "ExternalMessageId",
        value,
        reason: String(error),
      }),
  });

// === Unsafe Constructors (for internal use where validation is guaranteed) ===
// Use these only when you're certain the input is valid

export const unsafeConversationId = (value: string): ConversationId =>
  value as ConversationId;
export const unsafeMessageId = (value: string): MessageId => value as MessageId;
export const unsafeCampaignId = (value: string): CampaignId =>
  value as CampaignId;
export const unsafePhoneNumber = (value: string): PhoneNumber =>
  value as PhoneNumber;
export const unsafeOrganizationSlug = (value: string): OrganizationSlug =>
  value as OrganizationSlug;
export const unsafeMessageContent = (value: string): MessageContent =>
  value as MessageContent;
export const unsafeMessageType = (value: string): MessageType =>
  value as MessageType;
export const unsafeEventType = (value: string): EventType => value as EventType;
export const unsafeProvider = (value: string): Provider => value as Provider;
export const unsafeCursor = (value: string): Cursor => value as Cursor;
export const unsafeTimezone = (value: string): Timezone => value as Timezone;
export const unsafeMemberRole = (value: string): MemberRole =>
  value as MemberRole;
export const unsafeEventId = (value: string): EventId => value as EventId;
export const unsafeCampaignSegmentId = (value: string): CampaignSegmentId =>
  value as CampaignSegmentId;
export const unsafeExternalMessageId = (value: string): ExternalMessageId =>
  value as ExternalMessageId;
export const unsafeFailureReason = (value: string): FailureReason =>
  value as FailureReason;
