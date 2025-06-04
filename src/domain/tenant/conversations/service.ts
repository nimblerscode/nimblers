import { Context, Effect } from "effect";
import type {
  Conversation,
  Message,
  ConversationEvent,
  CreateMessageRequest,
  UpdateConversationStatusRequest,
  GetMessagesRequest,
  MessagesResponse,
  IncomingMessagePayload,
  ConversationNotFoundError,
  MessageNotFoundError,
  ConversationCreationError,
  MessageSendError,
  ConversationUpdateError,
} from "./models";

// Database-level errors (infrastructure layer)
export class DbError extends Error {
  readonly _tag = "DbError";
  constructor(public cause: unknown) {
    super("Database operation failed");
  }
}

// Repository interface for conversation data access
export abstract class ConversationRepo extends Context.Tag(
  "@conversations/ConversationRepo"
)<
  ConversationRepo,
  {
    readonly get: (
      conversationId: string
    ) => Effect.Effect<Conversation | null, DbError>;
    readonly create: (
      data: Omit<Conversation, "id" | "createdAt">
    ) => Effect.Effect<Conversation, ConversationCreationError | DbError>;
    readonly updateStatus: (
      conversationId: string,
      status: Conversation["status"]
    ) => Effect.Effect<Conversation, ConversationNotFoundError | DbError>;
    readonly updateLastMessageAt: (
      conversationId: string,
      timestamp: Date
    ) => Effect.Effect<void, ConversationNotFoundError | DbError>;
    readonly getByOrganization: (
      organizationSlug: string,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        conversations: Conversation[];
        hasMore: boolean;
        cursor: string | null;
      },
      DbError
    >;
    readonly getByCampaign: (
      campaignId: string,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        conversations: Conversation[];
        hasMore: boolean;
        cursor: string | null;
      },
      DbError
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
      conversationId: string,
      data: Omit<Message, "id" | "createdAt">
    ) => Effect.Effect<Message, DbError>;
    readonly get: (messageId: string) => Effect.Effect<Message | null, DbError>;
    readonly getByConversation: (
      conversationId: string,
      options: GetMessagesRequest
    ) => Effect.Effect<MessagesResponse, DbError>;
    readonly updateStatus: (
      messageId: string,
      status: Message["status"],
      metadata?: {
        sentAt?: Date;
        deliveredAt?: Date;
        readAt?: Date;
        failedAt?: Date;
        failureReason?: string;
      }
    ) => Effect.Effect<Message, MessageNotFoundError | DbError>;
    readonly updateExternalId: (
      messageId: string,
      externalMessageId: string
    ) => Effect.Effect<void, MessageNotFoundError | DbError>;
  }
>() {}

// Repository interface for conversation events (optional)
export abstract class ConversationEventRepo extends Context.Tag(
  "@conversations/ConversationEventRepo"
)<
  ConversationEventRepo,
  {
    readonly create: (
      conversationId: string,
      data: Omit<ConversationEvent, "id" | "createdAt">
    ) => Effect.Effect<ConversationEvent, DbError>;
    readonly getByConversation: (
      conversationId: string,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      { events: ConversationEvent[]; hasMore: boolean; cursor: string | null },
      DbError
    >;
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

// Use case interface for conversation business logic
export abstract class ConversationUseCase extends Context.Tag(
  "@conversations/ConversationUseCase"
)<
  ConversationUseCase,
  {
    readonly getConversation: (
      conversationId: string
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly createConversation: (data: {
      organizationSlug: string;
      campaignId?: string;
      customerPhone: string;
      storePhone: string;
      metadata?: string;
    }) => Effect.Effect<Conversation, ConversationCreationError | DbError>;
    readonly updateConversationStatus: (
      conversationId: string,
      request: UpdateConversationStatusRequest
    ) => Effect.Effect<
      Conversation,
      ConversationNotFoundError | ConversationUpdateError | DbError
    >;
    readonly getMessages: (
      conversationId: string,
      request: GetMessagesRequest
    ) => Effect.Effect<MessagesResponse, ConversationNotFoundError | DbError>;
    readonly sendMessage: (
      conversationId: string,
      request: CreateMessageRequest
    ) => Effect.Effect<
      Message,
      ConversationNotFoundError | MessageSendError | DbError
    >;
    readonly receiveMessage: (
      conversationId: string,
      payload: IncomingMessagePayload
    ) => Effect.Effect<
      Message,
      ConversationNotFoundError | ConversationCreationError | DbError
    >;
    readonly getConversationSummary: (conversationId: string) => Effect.Effect<
      {
        conversation: Conversation;
        messageCount: number;
        lastMessage: Message | null;
        unreadCount: number;
      },
      ConversationNotFoundError | DbError
    >;
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
      conversationId: string
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly sendMessage: (
      conversationId: string,
      content: string
    ) => Effect.Effect<{ message: Message }, MessageSendError>;
    readonly receiveMessage: (
      conversationId: string,
      payload: IncomingMessagePayload
    ) => Effect.Effect<
      { success: boolean; messageId: string; status: string },
      ConversationUpdateError
    >;
  }
>() {}
