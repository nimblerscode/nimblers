import { Schema } from "effect";
import { Data } from "effect";

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
  id: Schema.String,
  organizationSlug: Schema.String,
  campaignId: Schema.Union(Schema.String, Schema.Null),
  customerPhone: Schema.String,
  storePhone: Schema.String,
  status: ConversationStatus,
  lastMessageAt: Schema.Union(Schema.DateFromSelf, Schema.Null),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.Union(Schema.String, Schema.Null), // JSON string
}).pipe(Schema.required);

export type Conversation = Schema.Schema.Type<typeof Conversation>;

export const Message = Schema.Struct({
  id: Schema.String,
  direction: MessageDirection,
  content: Schema.String,
  status: MessageStatus,
  messageType: Schema.NullishOr(Schema.String),
  externalMessageId: Schema.NullishOr(Schema.String),
  sentAt: Schema.NullishOr(Schema.DateFromSelf),
  deliveredAt: Schema.NullishOr(Schema.DateFromSelf),
  readAt: Schema.NullishOr(Schema.DateFromSelf),
  failedAt: Schema.NullishOr(Schema.DateFromSelf),
  failureReason: Schema.NullishOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.NullishOr(Schema.String), // JSON string
});

export type Message = Schema.Schema.Type<typeof Message>;

export const ConversationEvent = Schema.Struct({
  id: Schema.String,
  eventType: Schema.String,
  description: Schema.NullishOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.NullishOr(Schema.String), // JSON string
});

export type ConversationEvent = Schema.Schema.Type<typeof ConversationEvent>;

// Request/Response schemas
export const CreateMessageRequest = Schema.Struct({
  content: Schema.String,
  messageType: Schema.optionalWith(Schema.String, { default: () => "text" }),
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
  cursor: Schema.optional(Schema.String),
  direction: Schema.optional(MessageDirection),
});

export type GetMessagesRequest = Schema.Schema.Type<typeof GetMessagesRequest>;

export const MessagesResponse = Schema.Struct({
  messages: Schema.Array(Message),
  pagination: Schema.Struct({
    hasMore: Schema.Boolean,
    cursor: Schema.NullishOr(Schema.String),
  }),
});

export type MessagesResponse = Schema.Schema.Type<typeof MessagesResponse>;

// Webhook payload for incoming messages
export const IncomingMessagePayload = Schema.Struct({
  externalMessageId: Schema.String,
  from: Schema.String, // Customer phone
  to: Schema.String, // Store phone
  content: Schema.String,
  messageType: Schema.optionalWith(Schema.String, { default: () => "text" }),
  timestamp: Schema.optional(Schema.DateFromSelf),
  provider: Schema.optionalWith(Schema.String, { default: () => "twilio" }),
  metadata: Schema.optional(Schema.String),
});

export type IncomingMessagePayload = Schema.Schema.Type<
  typeof IncomingMessagePayload
>;

// Domain errors
export class ConversationNotFoundError extends Data.TaggedError(
  "ConversationNotFoundError"
)<{
  conversationId: string;
}> {}

export class MessageNotFoundError extends Data.TaggedError(
  "MessageNotFoundError"
)<{
  messageId: string;
}> {}

export class ConversationCreationError extends Data.TaggedError(
  "ConversationCreationError"
)<{
  reason: string;
}> {}

export class MessageSendError extends Data.TaggedError("MessageSendError")<{
  reason: string;
  messageId?: string;
}> {}

export class ConversationUpdateError extends Data.TaggedError(
  "ConversationUpdateError"
)<{
  reason: string;
  conversationId: string;
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
    id: conversation.id,
    organizationSlug: conversation.organizationSlug,
    customerPhone: conversation.customerPhone,
    storePhone: conversation.storePhone,
    status: conversation.status,
    campaignId: conversation.campaignId ?? null,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    metadata: conversation.metadata ?? null,
  };

  // Validate against schema
  return Schema.decodeSync(SerializableConversation)(serialized);
}

export function messageToSerializable(message: Message): SerializableMessage {
  const serialized = {
    ...message,
    messageType: message.messageType ?? null,
    externalMessageId: message.externalMessageId ?? null,
    sentAt: message.sentAt?.toISOString() ?? null,
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
    failedAt: message.failedAt?.toISOString() ?? null,
    failureReason: message.failureReason ?? null,
    createdAt: message.createdAt.toISOString(),
    metadata: message.metadata ?? null,
  };

  // Validate against schema
  return Schema.decodeSync(SerializableMessage)(serialized);
}

// API Response schemas for server actions
export const GetConversationResponse = Schema.Struct({
  conversation: Schema.Union(SerializableConversation, Schema.Null),
  error: Schema.optional(Schema.String),
});

export type GetConversationResponse = Schema.Schema.Type<
  typeof GetConversationResponse
>;

export const SendMessageResponse = Schema.Struct({
  success: Schema.Boolean,
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
