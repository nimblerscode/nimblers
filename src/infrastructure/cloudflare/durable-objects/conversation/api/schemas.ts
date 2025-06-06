import {
  ConversationStatus,
  MessageStatus,
} from "@/domain/tenant/conversations/models";
import { MessageDirection } from "@/domain/tenant/conversations/models";
import {
  CampaignId,
  MessageType,
  ConversationId,
  MessageContent,
  MessageId,
  OrganizationSlug,
  PhoneNumber,
  ExternalMessageId,
  Cursor,
} from "@/domain/tenant/shared/branded-types";
import { Schema } from "effect";

// Base schemas for conversation entities
const ConversationSchema = Schema.Struct({
  id: ConversationId,
  organizationSlug: OrganizationSlug,
  campaignId: Schema.NullOr(CampaignId),
  customerPhone: PhoneNumber,
  storePhone: PhoneNumber,
  status: ConversationStatus,
  lastMessageAt: Schema.NullOr(Schema.DateFromSelf),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.NullOr(Schema.String),
});

const MessageSchema = Schema.Struct({
  id: MessageId,
  direction: MessageDirection,
  content: MessageContent,
  status: MessageStatus,
  messageType: MessageType,
  externalMessageId: Schema.NullOr(ExternalMessageId),
  sentAt: Schema.NullOr(Schema.DateFromSelf),
  deliveredAt: Schema.NullOr(Schema.DateFromSelf),
  readAt: Schema.NullOr(Schema.DateFromSelf),
  failedAt: Schema.NullOr(Schema.DateFromSelf),
  failureReason: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  metadata: Schema.optional(Schema.NullOr(Schema.String)),
});

// API endpoint schemas
export const ConversationApiSchemas = {
  createConversation: {
    request: Schema.Struct({
      organizationSlug: OrganizationSlug,
      campaignId: Schema.NullOr(CampaignId),
      customerPhone: PhoneNumber,
      storePhone: PhoneNumber,
      status: ConversationStatus,
      metadata: Schema.NullOr(Schema.String),
    }),
    response: ConversationSchema,
  },

  getConversation: {
    response: ConversationSchema,
  },

  getMessages: {
    urlParams: Schema.Struct({
      limit: Schema.NumberFromString,
      cursor: Cursor,
      direction: MessageDirection,
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
      content: MessageContent,
      messageType: Schema.optional(MessageType),
    }),
    response: Schema.Struct({
      message: MessageSchema,
    }),
  },

  updateConversationStatus: {
    request: Schema.Struct({
      status: ConversationStatus,
    }),
    response: Schema.Struct({
      conversation: ConversationSchema,
    }),
  },

  getConversationSummary: {
    response: Schema.Struct({
      id: ConversationId,
      status: ConversationStatus,
      lastMessageAt: Schema.DateFromSelf,
      messageCount: Schema.Number,
      lastMessage: Schema.Struct({
        id: MessageId,
        direction: MessageDirection,
        content: MessageContent,
        createdAt: Schema.DateFromSelf,
      }),
    }),
  },

  receiveMessage: {
    request: Schema.Struct({
      // Twilio webhook format
      MessageSid: Schema.optional(ExternalMessageId),
      From: Schema.optional(PhoneNumber),
      To: Schema.optional(PhoneNumber),
      Body: Schema.optional(MessageContent),
      // Generic format
      id: Schema.optional(MessageId),
      from: Schema.optional(PhoneNumber),
      to: Schema.optional(PhoneNumber),
      content: Schema.optional(MessageContent),
    }),
    response: Schema.Struct({
      success: Schema.Boolean,
      messageId: MessageId,
      status: MessageStatus,
    }),
  },
};
