import { ConversationUseCaseLive } from "@/application/tenant/conversations/service";
import { ConversationUseCase } from "@/domain/tenant/conversations/service";
import { ConversationEventRepoLive } from "@/infrastructure/persistence/conversation/sqlite/ConversationEventRepoLive";
import { ConversationRepoLive } from "@/infrastructure/persistence/conversation/sqlite/ConversationRepoLive";
import { MessageRepoLive } from "@/infrastructure/persistence/conversation/sqlite/MessageRepoLive";
import { ConversationMessagingServiceLive } from "@/infrastructure/messaging/conversation/ConversationMessagingServiceLive";
import {
  TwilioConfig,
  TwilioApiClientLive,
  TwilioSDKService,
  TwilioMessageProviderLive,
} from "@/infrastructure/messaging/twilio";
import { Twilio } from "twilio";

import {
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";

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

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

// Define conversation endpoints
const getConversation = HttpApiEndpoint.get("getConversation", "/conversation")
  .addSuccess(ConversationApiSchemas.getConversation.response)
  .addError(HttpApiError.NotFound);

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

// Group all conversation-related endpoints
const conversationsGroup = HttpApiGroup.make("conversations")
  .add(getConversation)
  .add(getMessages)
  .add(sendMessage)
  .add(updateConversationStatus)
  .add(getConversationSummary)
  .add(receiveMessage)
  .addError(Unauthorized, { status: 401 });

// Combine the groups into one API
const api = HttpApi.make("conversationApi").add(conversationsGroup);

// Export the API definition for client generation
export { api as conversationApi };

const conversationsGroupLive = (conversationId: string) =>
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
      .handle("getMessages", ({ urlParams }) => {
        return Effect.gen(function* () {
          const conversationUseCase = yield* ConversationUseCase;
          const messagesResult = yield* conversationUseCase.getMessages(
            conversationId,
            {
              limit: urlParams?.limit ?? 20, // Provide default value
              cursor: urlParams?.cursor,
              direction: urlParams?.direction,
            }
          );

          // Ensure proper mapping for message optional fields
          const mappedMessages = messagesResult.messages.map((message) => ({
            ...message,
            messageType: message.messageType ?? "text",
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
              messageType: payload.messageType ?? "text", // Provide default value
            }
          );

          // Ensure proper mapping for message optional fields
          return {
            message: {
              ...message,
              messageType: message.messageType ?? "text",
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
            id: summary.conversation.id,
            status: summary.conversation.status,
            lastMessageAt: summary.conversation.lastMessageAt || new Date(),
            messageCount: summary.messageCount,
            lastMessage: summary.lastMessage
              ? {
                  id: summary.lastMessage.id,
                  direction: summary.lastMessage.direction,
                  content: summary.lastMessage.content,
                  createdAt: summary.lastMessage.createdAt,
                }
              : {
                  id: "none",
                  direction: "outbound" as const,
                  content: "No messages yet",
                  createdAt: new Date(),
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
            externalMessageId: payload.MessageSid || payload.id || "unknown",
            from: payload.From || payload.from || "unknown",
            to: payload.To || payload.to || "unknown",
            content: payload.Body || payload.content || "",
            messageType: "text",
            provider: "twilio",
          };

          const message = yield* conversationUseCase.receiveMessage(
            conversationId,
            incomingPayload
          );

          return {
            success: true,
            messageId: message.id,
            status: "processed",
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
  );

export function getConversationHandler(
  doState: DurableObjectState,
  conversationId: string,
  messagingConfig: {
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioFromNumber: string;
    twilioWebhookUrl?: string;
  }
) {
  // Validate conversation ID
  if (!conversationId || conversationId.trim().length === 0) {
    const errorMessage = `Conversation ID parameter is required but was empty or undefined. Provided ID: "${conversationId}"`;
    throw new Error(errorMessage);
  }

  // Create proper layers for conversation repositories and services
  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  // Repository layers with DrizzleDOClientLive provided with DORepoLayer
  const DrizzleClientLayer = Layer.provide(DrizzleDOClientLive, DORepoLayer);
  const ConversationRepoLayer = Layer.provide(
    ConversationRepoLive,
    DrizzleClientLayer
  );
  const MessageRepoLayer = Layer.provide(MessageRepoLive, DrizzleClientLayer);
  const ConversationEventRepoLayer = Layer.provide(
    ConversationEventRepoLive,
    DrizzleClientLayer
  );

  // PROPER HEXAGONAL ARCHITECTURE: Use the real TwilioMessageProviderLive
  // Following the same pattern as MessagingLayerLive in config/layers.ts
  const TwilioConfigLayer = Layer.succeed(TwilioConfig, {
    config: {
      accountSid: messagingConfig.twilioAccountSid,
      authToken: messagingConfig.twilioAuthToken,
      fromNumber: messagingConfig.twilioFromNumber as any,
      webhookUrl: messagingConfig.twilioWebhookUrl,
    },
  });

  const TwilioSDKLayer = Layer.succeed(TwilioSDKService, {
    sdk: new Twilio(
      messagingConfig.twilioAccountSid,
      messagingConfig.twilioAuthToken
    ),
  });

  const TwilioClientLayer = Layer.provide(TwilioApiClientLive, TwilioSDKLayer);
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
    ConversationEventRepoLayer,
    MessagingServiceLayer
  );

  // Use case layer that depends on all repositories and services
  const ConversationUseCaseLayer = Layer.provide(
    ConversationUseCaseLive(conversationId),
    AllRepoLayers
  );

  // Conversations group layer with all dependencies
  const conversationsGroupLayerLive = Layer.provide(
    conversationsGroupLive(conversationId),
    ConversationUseCaseLayer
  );

  // API layer with all required dependencies
  const ConversationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(conversationsGroupLayerLive)
  );

  // Final handler with all required layers
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(ConversationApiLive, HttpServer.layerContext, Tracing)
  );

  return { dispose, handler };
}
