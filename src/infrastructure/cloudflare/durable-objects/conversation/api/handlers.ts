import { ConversationUseCase } from "@/application/tenant/conversations/service";
import { ConversationUseCaseLive } from "@/application/tenant/conversations/service";
import { ConversationMessagingServiceLive } from "@/infrastructure/messaging/conversation/ConversationMessagingServiceLive";
import {
  TwilioApiClientLive,
  TwilioConfig,
  TwilioMessageProviderLive,
} from "@/infrastructure/messaging/twilio";
import { ConversationRepoLive } from "@/infrastructure/persistence/conversation/sqlite/ConversationRepoLive";
import { MessageRepoLive } from "@/infrastructure/persistence/conversation/sqlite/MessageRepoLive";

import {
  ConversationDrizzleDOClientLive,
  ConversationDurableObjectState,
} from "@/infrastructure/persistence/conversation/sqlite/drizzle";

import type { ConversationId } from "@/domain/tenant/shared/branded-types";
import {
  unsafeMessageId,
  unsafeMessageType,
  unsafeMessageContent,
  unsafeExternalMessageId,
  unsafePhoneNumber,
  unsafeProvider,
  PhoneNumber as PhoneNumberSchema,
  OrganizationSlug as OrganizationSlugSchema,
  MessageContent as MessageContentSchema,
  ExternalMessageId as ExternalMessageIdSchema,
  ConversationId as ConversationIdSchema,
} from "@/domain/tenant/shared/branded-types";
import { Tracing } from "@/tracing";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpServer,
} from "@effect/platform";
import { Effect, Layer, Schema } from "effect";
import { ConversationApiSchemas } from "./schemas";
// TEMPORARY: Disabled for debugging
import { ConversationAIService } from "@/domain/tenant/conversations/ai-service";
import { ConversationAIServiceLive } from "@/application/tenant/conversations/ai-service";
import { ShopifyMCPLayer, ConversationLayerWithMCP } from "@/config/layers";
import { WorkersAI } from "@/domain/global/ai/service";

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

// Define conversation endpoints
const getConversation = HttpApiEndpoint.get("getConversation", "/conversation")
  .addSuccess(ConversationApiSchemas.getConversation.response)
  .addError(HttpApiError.NotFound);

const createConversation = HttpApiEndpoint.post(
  "createConversation",
  "/conversation"
)
  .setPayload(ConversationApiSchemas.createConversation.request)
  .addSuccess(ConversationApiSchemas.createConversation.response)
  .addError(HttpApiError.BadRequest);

const getMessages = HttpApiEndpoint.get("getMessages", "/messages")
  .setUrlParams(ConversationApiSchemas.getMessages.urlParams)
  .addSuccess(ConversationApiSchemas.getMessages.response)
  .addError(HttpApiError.NotFound);

const sendMessage = HttpApiEndpoint.post("sendMessage", "/messages")
  .setPayload(ConversationApiSchemas.sendMessage.request)
  .addSuccess(ConversationApiSchemas.sendMessage.response)
  .addError(HttpApiError.BadRequest);

const updateConversationStatus = HttpApiEndpoint.patch(
  "updateConversationStatus",
  "/conversation/status"
)
  .setPayload(ConversationApiSchemas.updateConversationStatus.request)
  .addSuccess(ConversationApiSchemas.updateConversationStatus.response)
  .addError(HttpApiError.BadRequest);

const getConversationSummary = HttpApiEndpoint.get(
  "getConversationSummary",
  "/conversation/summary"
)
  .addSuccess(ConversationApiSchemas.getConversationSummary.response)
  .addError(HttpApiError.NotFound);

// Webhook endpoint for incoming messages (Twilio, etc.)
const receiveMessage = HttpApiEndpoint.post(
  "receiveMessage",
  "/webhook/message"
)
  .setPayload(ConversationApiSchemas.receiveMessage.request)
  .addSuccess(ConversationApiSchemas.receiveMessage.response)
  .addError(HttpApiError.BadRequest);

// SMS webhook endpoint for incoming messages from Twilio
const handleIncomingSMS = HttpApiEndpoint.post(
  "handleIncomingSMS",
  "/sms/incoming"
)
  .setPayload(
    Schema.Struct({
      From: PhoneNumberSchema,
      To: PhoneNumberSchema,
      Body: MessageContentSchema,
      MessageSid: ExternalMessageIdSchema,
      conversationId: ConversationIdSchema,
      organizationSlug: OrganizationSlugSchema,
      shopifyStoreDomain: Schema.optional(Schema.String),
    })
  )
  .addSuccess(
    Schema.Struct({
      success: Schema.Boolean,
      responseMessage: Schema.optional(MessageContentSchema),
    })
  )
  .addError(HttpApiError.BadRequest)
  .addError(HttpApiError.InternalServerError);

// Group all conversation-related endpoints
const conversationsGroup = HttpApiGroup.make("conversations")
  .add(getConversation)
  .add(createConversation)
  .add(getMessages)
  .add(sendMessage)
  .add(updateConversationStatus)
  .add(getConversationSummary)
  .add(receiveMessage)
  .add(handleIncomingSMS)
  .addError(Unauthorized, { status: 401 });

// Combine the groups into one API
const api = HttpApi.make("conversationApi").add(conversationsGroup);

// Export the API definition for client generation
export { api as conversationApi };

const conversationsGroupLive = (conversationId: ConversationId) =>
  HttpApiBuilder.group(api, "conversations", (handlers) =>
    handlers
      .handle("getConversation", () => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const conversation = yield* conversationUseCase.getConversation(
            conversationId
          );

          // Ensure proper mapping for optional fields
          return {
            ...conversation,
            campaignId: conversation.campaignId ?? null,
            lastMessageAt: conversation.lastMessageAt ?? null,
            metadata: conversation.metadata ?? null,
          };
        }).pipe(
          Effect.withSpan("ConversationDO.getConversation", {
            attributes: {
              "api.endpoint": "/conversation",
              "api.method": "GET",
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("createConversation", ({ payload }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const conversation = yield* conversationUseCase.createConversation({
            id: conversationId,
            organizationSlug: payload.organizationSlug,
            campaignId: payload.campaignId,
            customerPhone: payload.customerPhone,
            storePhone: payload.storePhone,
            status: payload.status,
            metadata: payload.metadata,
          });

          // Log what we got from the use case
          yield* Effect.logInfo(
            "ConversationDO: received conversation from use case",
            {
              conversation: {
                id: conversation.id,
                lastMessageAt: conversation.lastMessageAt,
                createdAt: conversation.createdAt,
                lastMessageAtType: typeof conversation.lastMessageAt,
                createdAtType: typeof conversation.createdAt,
              },
            }
          );

          // Ensure proper mapping for optional fields
          const response = {
            ...conversation,
            campaignId: conversation.campaignId ?? null,
            lastMessageAt: conversation.lastMessageAt ?? null,
            metadata: conversation.metadata ?? null,
          };

          // Log the final response
          yield* Effect.logInfo("ConversationDO: returning response", {
            response: {
              id: response.id,
              lastMessageAt: response.lastMessageAt,
              createdAt: response.createdAt,
              lastMessageAtType: typeof response.lastMessageAt,
              createdAtType: typeof response.createdAt,
            },
          });

          return response;
        }).pipe(
          Effect.withSpan("ConversationDO.createConversation", {
            attributes: {
              "api.endpoint": "/conversation",
              "api.method": "POST",
              "conversation.id": conversationId,
              "conversation.customerPhone": payload.customerPhone,
              "conversation.organizationSlug": payload.organizationSlug,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("getMessages", ({ urlParams }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const messagesResult = yield* conversationUseCase.getMessages(
            conversationId,
            {
              limit: urlParams.limit ?? 20,
              cursor: urlParams.cursor ?? null,
              direction: urlParams.direction ?? "outbound",
            }
          );

          // Ensure proper mapping for message optional fields - preserve branded types
          const mappedMessages = messagesResult.messages.map((message) => ({
            ...message,
            messageType: message.messageType ?? unsafeMessageType("text"),
            externalMessageId: message.externalMessageId ?? null,
            sentAt: message.sentAt ?? null,
            deliveredAt: message.deliveredAt ?? null,
            readAt: message.readAt ?? null,
            failedAt: message.failedAt ?? null,
            metadata: message.metadata ?? null,
            failureReason: message.failureReason ?? null,
          }));

          return {
            messages: mappedMessages,
            pagination: {
              ...messagesResult.pagination,
              cursor: messagesResult.pagination.cursor ?? null,
            },
          };
        }).pipe(
          Effect.withSpan("ConversationDO.getMessages", {
            attributes: {
              "api.endpoint": "/messages",
              "api.method": "GET",
              "pagination.limit": urlParams?.limit,
              "pagination.cursor": urlParams?.cursor,
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("sendMessage", ({ payload }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const message = yield* conversationUseCase.sendMessage(
            conversationId,
            {
              content: payload.content,
              messageType: payload.messageType ?? unsafeMessageType("text"), // Use proper branded type
            }
          );

          // Ensure proper mapping for message optional fields - preserve branded types
          return {
            message: {
              ...message,
              messageType: message.messageType ?? unsafeMessageType("text"),
              externalMessageId: message.externalMessageId ?? null,
              sentAt: message.sentAt ?? null,
              deliveredAt: message.deliveredAt ?? null,
              readAt: message.readAt ?? null,
              failedAt: message.failedAt ?? null,
              metadata: message.metadata ?? null,
              failureReason: message.failureReason ?? null,
            },
          };
        }).pipe(
          Effect.withSpan("ConversationDO.sendMessage", {
            attributes: {
              "message.content.length": payload.content.length,
              "message.type": payload.messageType || "text",
              "api.endpoint": "/messages",
              "api.method": "POST",
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("updateConversationStatus", ({ payload }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const conversation =
            yield* conversationUseCase.updateConversationStatus(
              conversationId,
              { status: payload.status }
            );

          // Ensure proper mapping for optional fields
          return {
            conversation: {
              ...conversation,
              campaignId: conversation.campaignId ?? null,
              lastMessageAt: conversation.lastMessageAt ?? null,
              metadata: conversation.metadata ?? null,
            },
          };
        }).pipe(
          Effect.withSpan("ConversationDO.updateConversationStatus", {
            attributes: {
              "conversation.status.new": payload.status,
              "api.endpoint": "/conversation/status",
              "api.method": "PATCH",
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("getConversationSummary", () => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const summary = yield* conversationUseCase.getConversationSummary(
            conversationId
          );

          return {
            id: summary.conversation,
            status: "active" as const,
            lastMessageAt: summary.lastActivity || new Date(),
            messageCount: summary.messageCount,
            lastMessage: {
              id: unsafeMessageId("none"),
              direction: "outbound" as const,
              content: unsafeMessageContent("No messages yet"),
              createdAt: summary.lastActivity || new Date(),
            },
          };
        }).pipe(
          Effect.withSpan("ConversationDO.getConversationSummary", {
            attributes: {
              "api.endpoint": "/conversation/summary",
              "api.method": "GET",
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("receiveMessage", ({ payload }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;

          // Parse incoming webhook data (support both Twilio and generic formats)
          const incomingPayload = {
            externalMessageId: payload.MessageSid
              ? unsafeExternalMessageId(payload.MessageSid)
              : payload.id
              ? unsafeExternalMessageId(payload.id)
              : unsafeExternalMessageId("unknown"),
            from: payload.From
              ? unsafePhoneNumber(payload.From)
              : payload.from
              ? unsafePhoneNumber(payload.from)
              : unsafePhoneNumber("unknown"),
            to: payload.To
              ? unsafePhoneNumber(payload.To)
              : payload.to
              ? unsafePhoneNumber(payload.to)
              : unsafePhoneNumber("unknown"),
            content: payload.Body
              ? unsafeMessageContent(payload.Body)
              : payload.content
              ? unsafeMessageContent(payload.content)
              : unsafeMessageContent(""),
            messageType: unsafeMessageType("text"),
            provider: unsafeProvider("twilio"),
          };

          const message = yield* conversationUseCase.receiveMessage(
            conversationId,
            incomingPayload
          );

          return {
            success: true,
            messageId: message.id,
            status: "sent" as const,
          };
        }).pipe(
          Effect.withSpan("ConversationDO.receiveMessage", {
            attributes: {
              "message.external.id": payload.MessageSid || payload.id,
              "message.from": payload.From || payload.from,
              "api.endpoint": "/webhook/message",
              "api.method": "POST",
              "conversation.id": conversationId,
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("handleIncomingSMS", ({ payload }) => {
        // Add console.log for immediate visibility
        console.log("🚨 HANDLER CALLED: handleIncomingSMS", {
          payload,
          timestamp: new Date().toISOString(),
        });

        return Effect.gen(function* () {
          console.log("🚨 EFFECT CHAIN STARTED");

          yield* Effect.logInfo("=== HANDLE INCOMING SMS START ===", {
            timestamp: new Date().toISOString(),
          });

          // Add debugging for service availability
          console.log("🔍 DEBUG: Checking if ConversationUseCase is available");

          try {
            yield* Effect.logInfo(
              "=== ATTEMPTING TO GET CONVERSATION USE CASE ==="
            );
            const conversationUseCase = yield* ConversationUseCase;
            console.log("✅ ConversationUseCase obtained successfully");
            yield* Effect.logInfo("=== CONVERSATION USE CASE OBTAINED ===");
          } catch (error) {
            console.error("❌ Failed to get ConversationUseCase:", error);
            yield* Effect.logError("Failed to get ConversationUseCase", {
              error: String(error),
            });
            return yield* Effect.fail(new HttpApiError.InternalServerError());
          }

          console.log(
            "🔍 DEBUG: Checking if ConversationAIService is available"
          );

          // Get ConversationAI service for processing
          const conversationAIService = yield* ConversationAIService;
          console.log("✅ ConversationAIService obtained successfully");

          // Parse incoming SMS data with Shopify context
          const {
            From: customerPhone,
            To: storePhone,
            Body: messageContent,
            MessageSid: externalMessageId,
            conversationId,
            organizationSlug,
            shopifyStoreDomain,
          } = payload;

          yield* Effect.logInfo("Processing incoming SMS with AI", {
            conversationId,
            customerPhone,
            storePhone,
            messageContent,
            externalMessageId,
            organizationSlug,
            shopifyStoreDomain,
          });

          // Get conversation use case for sending response
          const conversationUseCase = yield* ConversationUseCase;

          // Process message with AI
          console.log("🤖 Processing message with ConversationAI service");
          const aiResponse = yield* conversationAIService.processMessage({
            conversationId,
            messageContent,
            organizationSlug,
            shopifyStoreDomain,
          });

          const responseMessage = String(aiResponse.responseMessage);
          console.log(
            "🤖 AI response generated:",
            responseMessage.substring(0, 100) + "..."
          );

          yield* Effect.logInfo("=== PREPARING TO SEND RESPONSE MESSAGE ===", {
            responseMessage,
          });

          // Send the response message back to the customer
          const outgoingPayload = {
            to: unsafePhoneNumber(customerPhone),
            content: unsafeMessageContent(responseMessage),
            messageType: unsafeMessageType("text"),
          };

          yield* Effect.logInfo(
            "=== CALLING CONVERSATION USE CASE SEND MESSAGE ==="
          );

          const sentMessage = yield* conversationUseCase.sendMessage(
            conversationId,
            outgoingPayload
          );

          yield* Effect.logInfo("Response sent successfully", {
            conversationId,
            messageId: sentMessage.id,
            responseLength: responseMessage.length,
            hasShopifyIntegration: !!shopifyStoreDomain,
          });

          yield* Effect.logInfo("=== HANDLE INCOMING SMS COMPLETE ===");

          return {
            success: true,
            responseMessage: unsafeMessageContent(responseMessage),
            sentMessageId: sentMessage.id,
          } as const;
        }).pipe(
          Effect.catchAll((error) => {
            return Effect.gen(function* () {
              yield* Effect.logError("=== HANDLE INCOMING SMS FAILED ===", {
                error: String(error),
                errorType: error?._tag,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                customerPhone: payload.From,
                messageContent: payload.Body,
                stack: error instanceof Error ? error.stack : undefined,
              });

              return yield* Effect.fail(new HttpApiError.InternalServerError());
            });
          })
        );
      })
  );

export function getConversationHandler(
  doState: DurableObjectState,
  conversationId: ConversationId,
  messagingConfig: {
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioFromNumber: string;
    twilioWebhookUrl?: string;
  },
  shopifyConfig: {
    storeDomain: string;
  },
  env: Env
) {
  console.log("🔧 DEBUG: getConversationHandler called", {
    conversationId,
    shopifyStoreDomain: shopifyConfig.storeDomain,
    hasEnvAI: !!env.AI,
  });

  // Validate conversation ID
  if (!conversationId || conversationId.trim().length === 0) {
    const errorMessage = `Conversation ID parameter is required but was empty or undefined. Provided ID: "${conversationId}"`;
    console.error("❌ Conversation ID validation failed:", errorMessage);
    throw new Error(errorMessage);
  }

  // Create proper layers for conversation repositories and services
  const DORepoLayer = Layer.succeed(ConversationDurableObjectState, doState);

  // Repository layers with ConversationDrizzleDOClientLive provided with DORepoLayer
  const DrizzleClientLayer = Layer.provide(
    ConversationDrizzleDOClientLive,
    DORepoLayer
  );
  const ConversationRepoLayer = Layer.provide(
    ConversationRepoLive,
    DrizzleClientLayer
  );
  const MessageRepoLayer = Layer.provide(MessageRepoLive, DrizzleClientLayer);

  // PROPER HEXAGONAL ARCHITECTURE: Use the real TwilioMessageProviderLive
  // Following the same pattern as MessagingLayerLive in config/layers.ts
  const TwilioConfigLayer = Layer.succeed(TwilioConfig, {
    accountSid: messagingConfig.twilioAccountSid,
    authToken: messagingConfig.twilioAuthToken,
    fromNumber: unsafePhoneNumber(messagingConfig.twilioFromNumber),
    webhookUrl: messagingConfig.twilioWebhookUrl,
  });

  // Fetch-based Twilio client layer
  const TwilioClientLayer = Layer.provide(
    TwilioApiClientLive,
    TwilioConfigLayer
  );
  const MessageProviderLayer = Layer.provide(
    TwilioMessageProviderLive,
    Layer.merge(TwilioClientLayer, TwilioConfigLayer)
  );

  const MessagingServiceLayer = Layer.provide(
    ConversationMessagingServiceLive,
    MessageProviderLayer
  );

  // Compose all repository layers
  const AllRepoLayers = Layer.mergeAll(
    ConversationRepoLayer,
    MessageRepoLayer,
    MessagingServiceLayer
  );

  // Use case layer that depends on all repositories and services
  const ConversationUseCaseLayer = Layer.provide(
    ConversationUseCaseLive(),
    AllRepoLayers
  );

  // Create Workers AI layer
  console.log("🔧 DEBUG: Creating WorkersAI layer", { hasAI: !!env.AI });
  const WorkersAILayer = Layer.succeed(WorkersAI, env.AI);

  // Create ConversationAI service layer properly
  const ConversationAIServiceLayer = Layer.provide(
    ConversationAIServiceLive,
    Layer.mergeAll(ConversationRepoLayer, MessageRepoLayer, WorkersAILayer)
  );

  // Final layer with all required services
  const FinalLayer = Layer.mergeAll(
    AllRepoLayers,
    ConversationUseCaseLayer,
    ConversationAIServiceLayer
  );

  // Conversations group layer with all dependencies
  const conversationsGroupLayerLive = Layer.provide(
    conversationsGroupLive(conversationId),
    FinalLayer
  );

  // API layer with all required dependencies provided
  const ConversationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(conversationsGroupLayerLive)
  );

  // Final handler
  console.log("🔧 DEBUG: Creating final handler");
  try {
    const { dispose, handler } = HttpApiBuilder.toWebHandler(
      Layer.mergeAll(ConversationApiLive, HttpServer.layerContext, Tracing)
    );
    console.log("🔧 DEBUG: Handler created successfully");
    return { dispose, handler };
  } catch (error) {
    console.error("❌ Failed to create handler:", error);
    throw error;
  }
}
