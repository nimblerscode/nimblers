import { Schema } from "effect";
import { Data } from "effect";
import {
  ConversationId,
  MessageId,
  ExternalMessageId,
  PhoneNumber,
  OrganizationSlug,
  CampaignId,
  MessageContent,
  MessageType,
  Provider,
  Cursor,
  type ConversationId as ConversationIdType,
  type MessageId as MessageIdType,
  type EventId as EventIdType,
  type ExternalMessageId as ExternalMessageIdType,
  type PhoneNumber as PhoneNumberType,
  type OrganizationSlug as OrganizationSlugType,
  type CampaignId as CampaignIdType,
  type MessageContent as MessageContentType,
  type MessageType as MessageTypeType,
  type EventType as EventTypeType,
  type Provider as ProviderType,
  type Cursor as CursorType,
} from "@/domain/tenant/shared/branded-types";

// Re-export branded types for convenience
export type {
  ConversationIdType as ConversationId,
  MessageIdType as MessageId,
  EventIdType as EventId,
  ExternalMessageIdType as ExternalMessageId,
  PhoneNumberType as PhoneNumber,
  OrganizationSlugType as OrganizationSlug,
  CampaignIdType as CampaignId,
  MessageContentType as MessageContent,
  MessageTypeType as MessageType,
  EventTypeType as EventType,
  ProviderType as Provider,
  CursorType as Cursor,
};

// Conversation status types
export const ConversationStatus = Schema.Literal(
  "active",
  "paused",
  "resolved",
  "archived"
);
export type ConversationStatus = Schema.Schema.Type<typeof ConversationStatus>;

// Message direction types
export const MessageDirection = Schema.Literal("inbound", "outbound");
export type MessageDirection = Schema.Schema.Type<typeof MessageDirection>;

// Message status types
export const MessageStatus = Schema.Literal(
  "pending",
  "sent",
  "delivered",
  "failed",
  "read"
);
export type MessageStatus = Schema.Schema.Type<typeof MessageStatus>;

// Core domain entities
export const Conversation = Schema.Struct({
  id: ConversationId,
  organizationSlug: OrganizationSlug,
  campaignId: Schema.Union(CampaignId, Schema.Null),
  customerPhone: PhoneNumber,
  storePhone: PhoneNumber,
  status: ConversationStatus,
  lastMessageAt: Schema.Union(Schema.DateFromSelf, Schema.Null),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.Union(Schema.String, Schema.Null), // JSON string
}).pipe(Schema.required);

export type Conversation = Schema.Schema.Type<typeof Conversation>;

export const Message = Schema.Struct({
  id: MessageId,
  direction: MessageDirection,
  content: MessageContent,
  status: MessageStatus,
  messageType: Schema.NullishOr(MessageType),
  externalMessageId: Schema.NullishOr(ExternalMessageId),
  sentAt: Schema.NullishOr(Schema.DateFromSelf),
  deliveredAt: Schema.NullishOr(Schema.DateFromSelf),
  readAt: Schema.NullishOr(Schema.DateFromSelf),
  failedAt: Schema.NullishOr(Schema.DateFromSelf),
  failureReason: Schema.NullishOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.NullishOr(Schema.String), // JSON string
});

export type Message = Schema.Schema.Type<typeof Message>;

// Request/Response schemas
export const CreateMessageRequest = Schema.Struct({
  content: MessageContent,
  messageType: Schema.optionalWith(MessageType, {
    default: () => Schema.decodeSync(MessageType)("text"),
  }),
  metadata: Schema.optional(Schema.String),
});

export type CreateMessageRequest = Schema.Schema.Type<
  typeof CreateMessageRequest
>;

export const UpdateConversationStatusRequest = Schema.Struct({
  status: ConversationStatus,
});

export type UpdateConversationStatusRequest = Schema.Schema.Type<
  typeof UpdateConversationStatusRequest
>;

export const GetMessagesRequest = Schema.Struct({
  limit: Schema.optionalWith(Schema.NumberFromString, { default: () => 50 }),
  cursor: Schema.optional(Cursor),
  direction: Schema.optional(MessageDirection),
});

export type GetMessagesRequest = Schema.Schema.Type<typeof GetMessagesRequest>;

export const MessagesResponse = Schema.Struct({
  messages: Schema.Array(Message),
  pagination: Schema.Struct({
    hasMore: Schema.Boolean,
    cursor: Schema.NullishOr(Cursor),
  }),
});

export type MessagesResponse = Schema.Schema.Type<typeof MessagesResponse>;

// Webhook payload for incoming messages
export const IncomingMessagePayload = Schema.Struct({
  externalMessageId: ExternalMessageId,
  from: PhoneNumber, // Customer phone
  to: PhoneNumber, // Store phone
  content: MessageContent,
  messageType: Schema.optionalWith(MessageType, {
    default: () => Schema.decodeSync(MessageType)("text"),
  }),
  timestamp: Schema.optional(Schema.DateFromSelf),
  provider: Schema.optionalWith(Provider, {
    default: () => Schema.decodeSync(Provider)("twilio"),
  }),
  metadata: Schema.optional(Schema.String),
});

export type IncomingMessagePayload = Schema.Schema.Type<
  typeof IncomingMessagePayload
>;

// Domain errors
export class ConversationNotFoundError extends Data.TaggedError(
  "ConversationNotFoundError"
)<{
  conversationId: ConversationId;
}> {}

export class MessageNotFoundError extends Data.TaggedError(
  "MessageNotFoundError"
)<{
  messageId: MessageId;
}> {}

export class MessagesNotFoundError extends Data.TaggedError(
  "MessagesNotFoundError"
) {}

export class ConversationCreationError extends Data.TaggedError(
  "ConversationCreationError"
)<{
  reason: string;
}> {}

export class MessageSendError extends Data.TaggedError("MessageSendError")<{
  reason: string;
  messageId?: MessageId;
}> {}

export class MessageCreateError extends Data.TaggedError("MessageCreateError")<{
  reason: string;
}> {}

export class MessageUpdateError extends Data.TaggedError("MessageUpdateError")<{
  reason: string;
  messageId: MessageId;
}> {}

export class ConversationUpdateError extends Data.TaggedError(
  "ConversationUpdateError"
)<{
  reason: string;
  conversationId: ConversationId;
}> {}

// Serializable schemas for client components
export const SerializableConversation = Schema.Struct({
  id: Schema.String,
  organizationSlug: Schema.String,
  campaignId: Schema.Union(Schema.String, Schema.Null),
  customerPhone: Schema.String,
  storePhone: Schema.String,
  status: ConversationStatus,
  lastMessageAt: Schema.Union(Schema.String, Schema.Null),
  createdAt: Schema.String,
  metadata: Schema.Union(Schema.String, Schema.Null),
});

export type SerializableConversation = Schema.Schema.Type<
  typeof SerializableConversation
>;

export const SerializableMessage = Schema.Struct({
  id: Schema.String,
  direction: MessageDirection,
  content: Schema.String,
  status: MessageStatus,
  messageType: Schema.Union(Schema.String, Schema.Null),
  externalMessageId: Schema.Union(Schema.String, Schema.Null),
  sentAt: Schema.Union(Schema.String, Schema.Null),
  deliveredAt: Schema.Union(Schema.String, Schema.Null),
  readAt: Schema.Union(Schema.String, Schema.Null),
  failedAt: Schema.Union(Schema.String, Schema.Null),
  failureReason: Schema.Union(Schema.String, Schema.Null),
  createdAt: Schema.String,
  metadata: Schema.Union(Schema.String, Schema.Null),
});

export type SerializableMessage = Schema.Schema.Type<
  typeof SerializableMessage
>;

// Conversion utilities with schema validation
export function conversationToSerializable(
  conversation: Conversation
): SerializableConversation {
  const serialized = {
    id: conversation.id as string,
    organizationSlug: conversation.organizationSlug as string,
    customerPhone: conversation.customerPhone as string,
    storePhone: conversation.storePhone as string,
    status: conversation.status,
    campaignId: conversation.campaignId as string | null,
    lastMessageAt: conversation.lastMessageAt
      ? conversation.lastMessageAt.toISOString()
      : null,
    createdAt: conversation.createdAt.toISOString(),
    metadata: conversation.metadata ?? null,
  };

  // Validate the conversion using the schema
  return Schema.decodeSync(SerializableConversation)(serialized);
}

export function messageToSerializable(message: Message): SerializableMessage {
  const serialized = {
    id: message.id as string,
    direction: message.direction,
    content: message.content as string,
    status: message.status,
    messageType: message.messageType as string | null,
    externalMessageId: message.externalMessageId as string | null,
    sentAt: message.sentAt ? message.sentAt.toISOString() : null,
    deliveredAt: message.deliveredAt ? message.deliveredAt.toISOString() : null,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    failedAt: message.failedAt ? message.failedAt.toISOString() : null,
    failureReason: message.failureReason ?? null,
    createdAt: message.createdAt.toISOString(),
    metadata: message.metadata ?? null,
  };

  // Validate the conversion using the schema
  return Schema.decodeSync(SerializableMessage)(serialized);
}

export const GetConversationResponse = Schema.Struct({
  conversation: Conversation,
  error: Schema.optional(Schema.String),
});

export type GetConversationResponse = Schema.Schema.Type<
  typeof GetConversationResponse
>;

export const SendMessageResponse = Schema.Struct({
  message: Message,
  error: Schema.optional(Schema.String),
});

export type SendMessageResponse = Schema.Schema.Type<
  typeof SendMessageResponse
>;

export const SerializableMessagesResponse = Schema.Struct({
  messages: Schema.Array(SerializableMessage),
  pagination: Schema.Struct({
    hasMore: Schema.Boolean,
    cursor: Schema.Union(Schema.String, Schema.Null),
  }),
});

export type SerializableMessagesResponse = Schema.Schema.Type<
  typeof SerializableMessagesResponse
>;
