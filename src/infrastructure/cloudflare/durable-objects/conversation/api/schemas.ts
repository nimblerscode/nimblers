import { Schema } from "effect";

// Base schemas for conversation entities
const ConversationSchema = Schema.Struct({
  id: Schema.String,
  organizationSlug: Schema.String,
  campaignId: Schema.optional(Schema.NullOr(Schema.String)),
  customerPhone: Schema.String,
  storePhone: Schema.String,
  status: Schema.Literal("active", "paused", "resolved", "archived"),
  lastMessageAt: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.optional(Schema.NullOr(Schema.String)),
});

const MessageSchema = Schema.Struct({
  id: Schema.String,
  direction: Schema.Literal("inbound", "outbound"),
  content: Schema.String,
  status: Schema.Literal("pending", "sent", "delivered", "read", "failed"),
  messageType: Schema.String,
  externalMessageId: Schema.NullOr(Schema.String),
  sentAt: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  deliveredAt: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  readAt: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  failedAt: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  failureReason: Schema.optional(Schema.NullOr(Schema.String)),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.optional(Schema.NullOr(Schema.String)),
});

// API endpoint schemas
export const ConversationApiSchemas = {
  getConversation: {
    response: ConversationSchema,
  },

  getMessages: {
    urlParams: Schema.Struct({
      limit: Schema.optional(Schema.NumberFromString),
      cursor: Schema.optional(Schema.String),
      direction: Schema.optional(Schema.Literal("inbound", "outbound")),
    }),
    response: Schema.Struct({
      messages: Schema.Array(MessageSchema),
      pagination: Schema.Struct({
        hasMore: Schema.Boolean,
        cursor: Schema.NullOr(Schema.String),
      }),
    }),
  },

  sendMessage: {
    request: Schema.Struct({
      content: Schema.String,
      messageType: Schema.optional(Schema.String),
    }),
    response: Schema.Struct({
      message: MessageSchema,
    }),
  },

  updateConversationStatus: {
    request: Schema.Struct({
      status: Schema.Literal("active", "paused", "resolved", "archived"),
    }),
    response: Schema.Struct({
      conversation: ConversationSchema,
    }),
  },

  getConversationSummary: {
    response: Schema.Struct({
      id: Schema.String,
      status: Schema.Literal("active", "paused", "resolved", "archived"),
      lastMessageAt: Schema.DateFromSelf,
      messageCount: Schema.Number,
      lastMessage: Schema.Struct({
        id: Schema.String,
        direction: Schema.Literal("inbound", "outbound"),
        content: Schema.String,
        createdAt: Schema.DateFromSelf,
      }),
    }),
  },

  receiveMessage: {
    request: Schema.Struct({
      // Twilio webhook format
      MessageSid: Schema.optional(Schema.String),
      From: Schema.optional(Schema.String),
      To: Schema.optional(Schema.String),
      Body: Schema.optional(Schema.String),
      // Generic format
      id: Schema.optional(Schema.String),
      from: Schema.optional(Schema.String),
      to: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
      messageId: Schema.String,
      status: Schema.String,
    }),
  },
};
