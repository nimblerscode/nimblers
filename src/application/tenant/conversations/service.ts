import { Context, Effect, Layer, Schema } from "effect";
import type {
  Conversation,
  CreateMessageRequest,
  GetMessagesRequest,
  IncomingMessagePayload,
  Message,
  MessagesResponse,
  UpdateConversationStatusRequest,
} from "@/domain/tenant/conversations/models";
import {
  ConversationCreationError,
  ConversationNotFoundError,
  ConversationStatus,
  ConversationUpdateError,
  MessageSendError,
} from "@/domain/tenant/conversations/models";
import {
  ConversationRepo,
  MessageRepo,
  MessagingService,
} from "@/domain/tenant/conversations/service";
import {
  CampaignId,
  ConversationId,
  makeMessageContent,
  makeMessageType,
  OrganizationSlug,
  PhoneNumber,
} from "@/domain/tenant/shared/branded-types";

// === Request Schemas ===
export const CreateConversationRequestSchema = Schema.Struct({
  organizationSlug: OrganizationSlug,
  campaignId: Schema.NullOr(CampaignId),
  customerPhone: PhoneNumber,
  storePhone: PhoneNumber,
  status: ConversationStatus,
  metadata: Schema.NullOr(Schema.String),
});

export type CreateConversationRequest = Schema.Schema.Type<
  typeof CreateConversationRequestSchema
>;

export const ConversationSummarySchema = Schema.Struct({
  conversation: ConversationId,
  messageCount: Schema.Number,
  lastActivity: Schema.NullOr(Schema.DateFromSelf),
});

export type ConversationSummary = Schema.Schema.Type<
  typeof ConversationSummarySchema
>;

// === Service Interface ===
export abstract class ConversationUseCase extends Context.Tag(
  "@core/ConversationUseCase"
)<
  ConversationUseCase,
  {
    readonly getConversation: (
      conversationId: ConversationId
    ) => Effect.Effect<Conversation, ConversationNotFoundError>;
    readonly createConversation: (
      data: CreateConversationRequest
    ) => Effect.Effect<Conversation, ConversationCreationError>;
    readonly updateConversationStatus: (
      conversationId: ConversationId,
      request: UpdateConversationStatusRequest
    ) => Effect.Effect<
      Conversation,
      ConversationNotFoundError | ConversationUpdateError
    >;
    readonly getMessages: (
      conversationId: ConversationId,
      request: GetMessagesRequest
    ) => Effect.Effect<MessagesResponse, ConversationNotFoundError>;
    readonly sendMessage: (
      conversationId: ConversationId,
      request: CreateMessageRequest
    ) => Effect.Effect<Message, MessageSendError | ConversationNotFoundError>;
    readonly receiveMessage: (
      conversationId: ConversationId,
      payload: IncomingMessagePayload
    ) => Effect.Effect<Message, ConversationNotFoundError | MessageSendError>;
    readonly getConversationSummary: (
      conversationId: ConversationId
    ) => Effect.Effect<ConversationSummary, ConversationNotFoundError>;
  }
>() {}

export const ConversationUseCaseLive = () =>
  Layer.effect(
    ConversationUseCase,
    Effect.gen(function* () {
      const conversationRepo = yield* ConversationRepo;
      const messageRepo = yield* MessageRepo;
      const messagingService = yield* MessagingService;

      return {
        getConversation: (conversationId: ConversationId) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            return conversation;
          }),

        createConversation: (data: CreateConversationRequest) =>
          Effect.gen(function* () {
            // Validate input using schema
            const validatedData = yield* Schema.decodeUnknown(
              CreateConversationRequestSchema
            )(data);

            const conversation = yield* conversationRepo.create({
              ...validatedData,
              lastMessageAt: null,
            });

            return conversation;
          }).pipe(
            Effect.catchAll((error) => {
              // Map all errors to ConversationCreationError
              if (error instanceof ConversationCreationError) {
                return Effect.fail(error);
              }
              return Effect.fail(
                new ConversationCreationError({
                  reason: String(error),
                })
              );
            })
          ),

        updateConversationStatus: (
          conversationId,
          request: UpdateConversationStatusRequest
        ) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            const updatedConversation = yield* conversationRepo
              .updateStatus(conversationId, request.status)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new ConversationUpdateError({
                      reason: String(error),
                      conversationId,
                    })
                )
              );

            return updatedConversation;
          }).pipe(
            Effect.mapError((error) => {
              // Map BrandedTypeValidationError to ConversationUpdateError
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              if (error instanceof ConversationUpdateError) {
                return error;
              }
              return new ConversationUpdateError({
                reason: String(error),
                conversationId,
              });
            })
          ),
        getMessages: (conversationId, request: GetMessagesRequest) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            const messagesResult = yield* messageRepo
              .getAllMessages(request)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            return messagesResult[0];
          }),

        sendMessage: (conversationId, request: CreateMessageRequest) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            // Validate message content and type
            const content = yield* makeMessageContent(request.content);
            const messageType = request.messageType
              ? yield* makeMessageType(request.messageType)
              : yield* makeMessageType("text");

            const message = yield* messageRepo.create({
              direction: "outbound",
              content,
              status: "pending",
              messageType,
              externalMessageId: null,
              sentAt: null,
              deliveredAt: null,
              readAt: null,
              failedAt: null,
              failureReason: null,
              metadata: request.metadata ?? null,
            });

            // Send message via external service
            const sendResult = yield* messagingService
              .sendMessage(
                conversation.customerPhone,
                conversation.storePhone,
                request.content,
                request.messageType
              )
              .pipe(
                Effect.mapError(
                  (error) =>
                    new MessageSendError({
                      reason: String(error),
                      messageId: message.id,
                    })
                )
              );

            // Update message with external ID if successful
            if (sendResult.status === "sent") {
              yield* messageRepo
                .updateExternalId(message.id, sendResult.externalMessageId)
                .pipe(
                  Effect.mapError(
                    (error) =>
                      new MessageSendError({
                        reason: `Failed to update external ID: ${String(
                          error
                        )}`,
                        messageId: message.id,
                      })
                  )
                );
            } else {
              yield* messageRepo
                .updateStatus(message.id, "failed", {
                  failureReason: "Delivery failed",
                })
                .pipe(
                  Effect.mapError(
                    (error) =>
                      new MessageSendError({
                        reason: `Failed to update status: ${String(error)}`,
                        messageId: message.id,
                      })
                  )
                );
            }

            // Update conversation last message timestamp
            yield* conversationRepo.updateLastMessageAt(
              conversationId,
              new Date()
            );

            return message;
          }).pipe(
            Effect.mapError((error) => {
              // Map all errors to expected types
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              if (error instanceof MessageSendError) {
                return error;
              }
              return new MessageSendError({
                reason: String(error),
              });
            })
          ),

        receiveMessage: (conversationId, payload: IncomingMessagePayload) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            // Validate message content and type
            const content = yield* makeMessageContent(payload.content);
            const messageType = payload.messageType
              ? yield* makeMessageType(payload.messageType)
              : yield* makeMessageType("text");

            const message = yield* messageRepo.create({
              direction: "inbound",
              content,
              status: "delivered",
              messageType,
              externalMessageId: payload.externalMessageId,
              sentAt: payload.timestamp ?? new Date(),
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

            return message;
          }).pipe(
            Effect.mapError((error) => {
              // Map all errors to expected types
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              return new MessageSendError({
                reason: String(error),
              });
            })
          ),

        getConversationSummary: (conversationId: ConversationId) =>
          Effect.gen(function* () {
            const conversation = yield* conversationRepo
              .get(conversationId)
              .pipe(
                Effect.mapError(
                  () =>
                    new ConversationNotFoundError({
                      conversationId,
                    })
                )
              );

            if (!conversation) {
              return yield* Effect.fail(
                new ConversationNotFoundError({
                  conversationId,
                })
              );
            }

            // Simple summary without message count for now
            return {
              conversation: conversation.id,
              messageCount: 0,
              lastActivity: conversation.lastMessageAt,
            } as const;
          }).pipe(
            Effect.mapError((error) => {
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              return new ConversationNotFoundError({
                conversationId,
              });
            })
          ),
      };
    })
  );
