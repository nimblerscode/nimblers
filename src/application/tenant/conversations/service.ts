import { Context, Effect, Layer } from "effect";
import {
  ConversationUseCase,
  ConversationRepo,
  MessageRepo,
  MessagingService,
  ConversationEventRepo,
} from "@/domain/tenant/conversations/service";
import {
  type CreateMessageRequest,
  type UpdateConversationStatusRequest,
  type GetMessagesRequest,
  type IncomingMessagePayload,
  ConversationNotFoundError,
  ConversationCreationError,
  ConversationUpdateError,
  MessageSendError,
  type Conversation,
} from "@/domain/tenant/conversations/models";
import type { SendMessageResponse } from "@/domain/global/messaging/models";

export abstract class ConversationDOService extends Context.Tag(
  "@conversation/ConversationDOService"
)<
  ConversationDOService,
  {
    readonly getConversation: (
      conversationId: string
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly sendMessage: (
      conversationId: string,
      content: string
    ) => Effect.Effect<SendMessageResponse, MessageSendError>;
    readonly receiveMessage: (
      conversationId: string,
      payload: IncomingMessagePayload
    ) => Effect.Effect<Message, ConversationUpdateError>;
  }
>() {}

export const ConversationUseCaseLive = (conversationId: string) =>
  Layer.effect(
    ConversationUseCase,
    Effect.gen(function* () {
      const conversationRepo = yield* ConversationRepo;
      const messageRepo = yield* MessageRepo;
      const messagingService = yield* MessagingService;
      const eventRepo = yield* ConversationEventRepo;

      return {
        getConversation: (conversationId: string) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo.get(conversationId);

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({ conversationId })
              );
            }

            return conversation;
          }).pipe(
            Effect.mapError((error) => {
              // Map any repository error to domain error
              if (error._tag === "DbError") {
                return new ConversationNotFoundError({ conversationId });
              }
              return error as ConversationNotFoundError;
            }),
            Effect.withSpan("ConversationUseCase.getConversation")
          ),

        createConversation: (data: {
          organizationSlug: string;
          campaignId?: string;
          customerPhone: string;
          storePhone: string;
          metadata?: string;
        }) =>
          Effect.gen(function* () {
            // Generate a conversation ID based on organization and customer
            const generatedConversationId = `${
              data.organizationSlug
            }_${data.customerPhone.replace(/\+/g, "")}`;

            // Check if conversation already exists
            const existingConversation = yield* conversationRepo
              .get(generatedConversationId)
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error
                  if (error._tag === "DbError") {
                    return new ConversationCreationError({
                      reason: "Failed to check existing conversation",
                    });
                  }
                  return error;
                })
              );
            if (existingConversation) {
              return existingConversation;
            }

            // Create new conversation - ensure metadata is properly typed
            const conversation = yield* conversationRepo
              .create({
                organizationSlug: data.organizationSlug,
                campaignId: data.campaignId ?? null,
                customerPhone: data.customerPhone,
                storePhone: data.storePhone,
                status: "active",
                lastMessageAt: null,
                metadata: data.metadata ?? null,
              })
              .pipe(
                Effect.mapError((error) => {
                  // Map all errors to ConversationCreationError
                  if (error._tag === "DbError") {
                    return new ConversationCreationError({
                      reason: "Failed to create conversation in database",
                    });
                  }
                  // error is already a ConversationCreationError, return as-is
                  return error;
                })
              );

            // Log conversation created event
            yield* eventRepo
              .create(conversation.id, {
                eventType: "conversation_created",
                description: `Conversation created for customer ${data.customerPhone}`,
                metadata: JSON.stringify({
                  campaignId: data.campaignId,
                  organizationSlug: data.organizationSlug,
                }),
              })
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error for event creation
                  if (error._tag === "DbError") {
                    return new ConversationCreationError({
                      reason: "Failed to log conversation creation event",
                    });
                  }
                  return error;
                })
              );

            return conversation;
          }).pipe(Effect.withSpan("ConversationUseCase.createConversation")),

        updateConversationStatus: (
          conversationId: string,
          request: UpdateConversationStatusRequest
        ) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error
                  if (error._tag === "DbError") {
                    return new ConversationNotFoundError({ conversationId });
                  }
                  return error;
                })
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({ conversationId })
              );
            }

            const updatedConversation = yield* conversationRepo
              .updateStatus(conversationId, request.status)
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error
                  if (error._tag === "DbError") {
                    return new ConversationUpdateError({
                      reason: "Failed to update conversation status",
                      conversationId,
                    });
                  }
                  return error;
                })
              );

            // Log status change event
            yield* eventRepo
              .create(conversationId, {
                eventType: "status_changed",
                description: `Conversation status changed from ${conversation.status} to ${request.status}`,
                metadata: JSON.stringify({
                  previousStatus: conversation.status,
                  newStatus: request.status,
                }),
              })
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error for event creation
                  if (error._tag === "DbError") {
                    return new ConversationUpdateError({
                      reason: "Failed to log status change event",
                      conversationId,
                    });
                  }
                  return error;
                })
              );

            return updatedConversation;
          }).pipe(
            Effect.withSpan("ConversationUseCase.updateConversationStatus")
          ),

        getMessages: (conversationId: string, request: GetMessagesRequest) =>
          Effect.gen(function* () {
            // Verify conversation exists
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error
                  if (error._tag === "DbError") {
                    return new ConversationNotFoundError({ conversationId });
                  }
                  return error;
                })
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({ conversationId })
              );
            }

            return yield* messageRepo
              .getByConversation(conversationId, request)
              .pipe(
                Effect.mapError((error) => {
                  // Map DbError to domain error
                  if (error._tag === "DbError") {
                    return new ConversationNotFoundError({ conversationId });
                  }
                  return error;
                })
              );
          }).pipe(Effect.withSpan("ConversationUseCase.getMessages")),

        sendMessage: (conversationId: string, request: CreateMessageRequest) =>
          Effect.gen(function* () {
            // Verify conversation exists
            const conversation = yield* conversationRepo.get(conversationId);

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({ conversationId })
              );
            }

            // Create message record
            const message = yield* messageRepo.create(conversationId, {
              direction: "outbound",
              content: request.content,
              status: "pending",
              messageType: request.messageType || "text",
              externalMessageId: null,
              sentAt: null,
              deliveredAt: null,
              readAt: null,
              failedAt: null,
              failureReason: null,
              metadata: request.metadata ?? null,
            });

            // Send message via messaging service
            const sendResult = yield* messagingService.sendMessage(
              conversation.customerPhone,
              conversation.storePhone,
              request.content,
              request.messageType
            );

            // Update message with external ID and delivery status
            const updatedMessage = yield* messageRepo
              .updateStatus(
                message.id,
                sendResult.status === "sent" ? "sent" : "failed",
                {
                  sentAt: sendResult.status === "sent" ? new Date() : undefined,
                  failedAt:
                    sendResult.status === "failed" ? new Date() : undefined,
                  failureReason:
                    sendResult.status === "failed"
                      ? "Delivery failed"
                      : undefined,
                }
              )
              .pipe(
                Effect.mapError((error) => {
                  // Map MessageNotFoundError to MessageSendError
                  if (error._tag === "MessageNotFoundError") {
                    return new MessageSendError({
                      reason: "Failed to update message status",
                      messageId: message.id,
                    });
                  }
                  if (error._tag === "DbError") {
                    return new MessageSendError({
                      reason: "Database error while updating message",
                      messageId: message.id,
                    });
                  }
                  return error;
                })
              );

            yield* messageRepo
              .updateExternalId(message.id, sendResult.externalMessageId)
              .pipe(
                Effect.mapError((error) => {
                  // Map MessageNotFoundError to MessageSendError
                  if (error._tag === "MessageNotFoundError") {
                    return new MessageSendError({
                      reason: "Failed to update message external ID",
                      messageId: message.id,
                    });
                  }
                  if (error._tag === "DbError") {
                    return new MessageSendError({
                      reason:
                        "Database error while updating message external ID",
                      messageId: message.id,
                    });
                  }
                  return error;
                })
              );

            // Update conversation last message timestamp
            yield* conversationRepo.updateLastMessageAt(
              conversationId,
              new Date()
            );

            // Log message sent event
            yield* eventRepo.create(conversationId, {
              eventType: "message_sent",
              description: `Outbound message sent to ${conversation.customerPhone}`,
              metadata: JSON.stringify({
                messageId: message.id,
                externalMessageId: sendResult.externalMessageId,
                status: sendResult.status,
              }),
            });

            return updatedMessage;
          }).pipe(Effect.withSpan("ConversationUseCase.sendMessage")),

        receiveMessage: (
          conversationId: string,
          payload: IncomingMessagePayload
        ) =>
          Effect.gen(function* () {
            // Get or create conversation
            let conversation = yield* conversationRepo.get(conversationId);

            if (!conversation) {
              // Create new conversation for incoming message
              conversation = yield* conversationRepo.create({
                organizationSlug: conversationId.split("_")[0], // Extract org slug from conversation ID
                campaignId: null, // Incoming messages don't have campaigns initially
                customerPhone: payload.from,
                storePhone: payload.to,
                status: "active",
                lastMessageAt: null,
                metadata: payload.metadata ?? null,
              });
            }

            // Create inbound message record
            const message = yield* messageRepo.create(conversationId, {
              direction: "inbound",
              content: payload.content,
              status: "delivered", // Incoming messages are already delivered
              messageType: payload.messageType || "text",
              externalMessageId: payload.externalMessageId,
              sentAt: payload.timestamp || new Date(),
              deliveredAt: new Date(),
              readAt: null,
              failedAt: null,
              failureReason: null,
              metadata: payload.metadata ?? null,
            });

            // Update conversation last message timestamp
            yield* conversationRepo.updateLastMessageAt(
              conversationId,
              new Date()
            );

            // Log message received event
            yield* eventRepo.create(conversationId, {
              eventType: "message_received",
              description: `Inbound message received from ${payload.from}`,
              metadata: JSON.stringify({
                messageId: message.id,
                externalMessageId: payload.externalMessageId,
                provider: payload.provider,
              }),
            });

            return message;
          }).pipe(Effect.withSpan("ConversationUseCase.receiveMessage")),

        getConversationSummary: (conversationId: string) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo.get(conversationId);

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({ conversationId })
              );
            }

            // Get message statistics
            const messagesResponse = yield* messageRepo.getByConversation(
              conversationId,
              { limit: 1000 } // Get more messages for accurate count
            );

            const messages = messagesResponse.messages;
            const messageCount = messages.length;
            const lastMessage = messages.length > 0 ? messages[0] : null; // Messages are ordered by newest first
            const unreadCount = messages.filter(
              (msg) => msg.direction === "inbound" && !msg.readAt
            ).length;

            return {
              conversation,
              messageCount,
              lastMessage,
              unreadCount,
            };
          }).pipe(
            Effect.withSpan("ConversationUseCase.getConversationSummary")
          ),
      };
    })
  );
