import { Context, type Effect } from "effect";
import type {
  CampaignId,
  Conversation,
  ConversationCreationError,
  ConversationId,
  ConversationNotFoundError,
  ConversationUpdateError,
  CreateMessageRequest,
  GetMessagesRequest,
  IncomingMessagePayload,
  Message,
  MessageCreateError,
  MessageId,
  MessageNotFoundError,
  MessageSendError,
  MessagesNotFoundError,
  MessagesResponse,
  MessageUpdateError,
  UpdateConversationStatusRequest,
} from "./models";

// Repository interface for conversation data access
export abstract class ConversationRepo extends Context.Tag(
  "@conversations/ConversationRepo"
)<
  ConversationRepo,
  {
    readonly get: (
      conversationId: ConversationId
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly create: (
      data: Omit<Conversation, "id" | "createdAt">
    ) => Effect.Effect<Conversation, ConversationCreationError>;
    readonly updateStatus: (
      conversationId: ConversationId,
      status: Conversation["status"]
    ) => Effect.Effect<Conversation, ConversationUpdateError>;
    readonly updateLastMessageAt: (
      conversationId: ConversationId,
      timestamp: Date
    ) => Effect.Effect<void, ConversationUpdateError>;
    readonly getByCampaign: (
      campaignId: CampaignId,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        conversations: Conversation[];
        hasMore: boolean;
        cursor: string | null;
      },
      ConversationNotFoundError
    >;
  }
>() {}

// Repository interface for message data access
export abstract class MessageRepo extends Context.Tag(
  "@conversations/MessageRepo"
)<
  MessageRepo,
  {
    readonly create: (
      data: Omit<Message, "id" | "createdAt">
    ) => Effect.Effect<Message, MessageCreateError>;
    readonly get: (
      messageId: MessageId
    ) => Effect.Effect<Message, MessageNotFoundError>;
    readonly getAllMessages: (
      options: GetMessagesRequest
    ) => Effect.Effect<MessagesResponse[], MessagesNotFoundError>;
    readonly updateStatus: (
      messageId: MessageId,
      status: Message["status"],
      metadata?: {
        sentAt?: Date;
        deliveredAt?: Date;
        readAt?: Date;
        failedAt?: Date;
        failureReason?: string;
      }
    ) => Effect.Effect<Message, MessageUpdateError>;
    readonly updateExternalId: (
      messageId: MessageId,
      externalMessageId: string
    ) => Effect.Effect<void, MessageUpdateError>;
  }
>() {}

// External messaging service interface
export abstract class MessagingService extends Context.Tag(
  "@conversations/MessagingService"
)<
  MessagingService,
  {
    readonly sendMessage: (
      to: string,
      from: string,
      content: string,
      messageType?: string
    ) => Effect.Effect<
      { externalMessageId: string; status: "sent" | "failed" },
      MessageSendError
    >;
    readonly parseIncomingWebhook: (
      payload: unknown
    ) => Effect.Effect<IncomingMessagePayload, Error>;
  }
>() {}

/**
 * Durable Object service for distributed conversation operations
 */
export abstract class ConversationDOService extends Context.Tag(
  "domain/services/ConversationDO"
)<
  ConversationDOService,
  {
    readonly getConversation: (
      conversationId: ConversationId
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly sendMessage: (
      conversationId: ConversationId,
      content: string
    ) => Effect.Effect<{ message: Message }, MessageSendError>;
    readonly receiveMessage: (
      conversationId: ConversationId,
      payload: IncomingMessagePayload
    ) => Effect.Effect<
      { success: boolean; messageId: string; status: string },
      ConversationUpdateError
    >;
  }
>() {}
