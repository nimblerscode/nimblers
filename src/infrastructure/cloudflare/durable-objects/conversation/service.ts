import type { env } from "cloudflare:workers";
import { FetchHttpClient } from "@effect/platform";
import { Context, Effect, Layer, type Schema } from "effect";
import { createConversationDOClient } from "./api/client";
import type { ConversationApiSchemas } from "./api/schemas";
import {
  ConversationNotFoundError,
  MessageSendError,
  ConversationUpdateError,
  type ConversationId,
  type MessageContent,
} from "@/domain/tenant/conversations/models";
import { makeMessageType } from "@/domain/tenant/shared/branded-types";

// Export namespace for layer configuration
export abstract class ConversationDONamespace extends Context.Tag(
  "cloudflare/bindings/CONVERSATION_DO_NAMESPACE"
)<ConversationDONamespace, typeof env.CONVERSATION_DO>() {}

// Type aliases for clean service interface
type ConversationType = Schema.Schema.Type<
  typeof ConversationApiSchemas.getConversation.response
>;
type SendMessageResponseType = Schema.Schema.Type<
  typeof ConversationApiSchemas.sendMessage.response
>;
type ReceiveMessageResponseType = Schema.Schema.Type<
  typeof ConversationApiSchemas.receiveMessage.response
>;
type ReceiveMessageRequestType = Schema.Schema.Type<
  typeof ConversationApiSchemas.receiveMessage.request
>;

export abstract class ConversationDOService extends Context.Tag(
  "domain/services/ConversationDO"
)<
  ConversationDOService,
  {
    readonly getConversation: (
      conversationId: ConversationId
    ) => Effect.Effect<ConversationType, ConversationNotFoundError>;
    readonly sendMessage: (
      conversationId: ConversationId,
      content: MessageContent
    ) => Effect.Effect<SendMessageResponseType, MessageSendError>;
    readonly receiveMessage: (
      conversationId: ConversationId,
      payload: ReceiveMessageRequestType
    ) => Effect.Effect<ReceiveMessageResponseType, ConversationUpdateError>;
  }
>() {}

// Layer that provides the adapter implementation following organization pattern
export const ConversationDOAdapterLive = Layer.effect(
  ConversationDOService,
  Effect.gen(function* () {
    const conversationDONamespace = yield* ConversationDONamespace;

    const getConversationDO = (conversationId: ConversationId) => {
      return Effect.gen(function* () {
        yield* Effect.log("GET CONVERSATION DO START").pipe(
          Effect.annotateLogs({
            conversationId,
            timestamp: new Date().toISOString(),
          })
        );

        // Validate conversation ID before creating DO
        if (!conversationId) {
          return yield* Effect.fail(
            new ConversationNotFoundError({
              conversationId,
            })
          );
        }

        const doId = conversationDONamespace.idFromName(conversationId);
        const stub = conversationDONamespace.get(doId);

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createConversationDOClient(stub);

        // Use auto-generated method with perfect type safety!
        const conversation = yield* client.conversations.getConversation().pipe(
          Effect.mapError((error) => {
            return new ConversationNotFoundError({
              conversationId,
            });
          })
        );

        yield* Effect.log("Conversation retrieved successfully from DO").pipe(
          Effect.annotateLogs({
            conversationId: conversation.id,
            status: conversation.status,
          })
        );

        return conversation;
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer)
      );
    };

    const sendMessageDO = (
      conversationId: ConversationId,
      content: MessageContent
    ) => {
      return Effect.gen(function* () {
        yield* Effect.log("SEND MESSAGE DO START").pipe(
          Effect.annotateLogs({
            conversationId,
            contentLength: content.length,
            timestamp: new Date().toISOString(),
          })
        );

        // Validate inputs
        if (!conversationId || conversationId.trim().length === 0) {
          return yield* Effect.fail(
            new MessageSendError({
              reason: "Conversation ID is required",
            })
          );
        }

        if (!content || content.trim().length === 0) {
          return yield* Effect.fail(
            new MessageSendError({
              reason: "Message content is required",
            })
          );
        }

        const doId = conversationDONamespace.idFromName(conversationId);
        const stub = conversationDONamespace.get(doId);

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createConversationDOClient(stub);

        // Create message type safely
        const messageType = yield* makeMessageType("text").pipe(
          Effect.mapError(
            (error) =>
              new MessageSendError({
                reason: `Invalid message type: ${String(error)}`,
              })
          )
        );

        // Use auto-generated method with perfect type safety!
        const result = yield* client.conversations
          .sendMessage({
            payload: {
              content: content,
              messageType: messageType,
            },
          })
          .pipe(
            Effect.mapError((error) => {
              return new MessageSendError({
                reason: `Failed to send message: ${String(error)}`,
              });
            })
          );

        yield* Effect.log("Message sent successfully via DO").pipe(
          Effect.annotateLogs({
            messageId: result.message.id,
            conversationId,
          })
        );

        return result;
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer)
      );
    };

    const receiveMessageDO = (
      conversationId: ConversationId,
      payload: ReceiveMessageRequestType
    ) => {
      return Effect.gen(function* () {
        yield* Effect.log("RECEIVE MESSAGE DO START").pipe(
          Effect.annotateLogs({
            conversationId,
            hasFrom: !!(payload.From || payload.from),
            hasBody: !!(payload.Body || payload.content),
            timestamp: new Date().toISOString(),
          })
        );

        // Validate conversation ID
        if (!conversationId || conversationId.trim().length === 0) {
          return yield* Effect.fail(
            new ConversationUpdateError({
              reason: "Conversation ID is required",
              conversationId,
            })
          );
        }

        const doId = conversationDONamespace.idFromName(conversationId);
        const stub = conversationDONamespace.get(doId);

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createConversationDOClient(stub);

        // Use auto-generated method with perfect type safety!
        const result = yield* client.conversations
          .receiveMessage({ payload })
          .pipe(
            Effect.mapError((error) => {
              return new ConversationUpdateError({
                reason: `Failed to receive message: ${String(error)}`,
                conversationId,
              });
            })
          );

        yield* Effect.log("Message received successfully via DO").pipe(
          Effect.annotateLogs({
            messageId: result.messageId,
            conversationId,
            status: result.status,
          })
        );

        return result;
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer)
      );
    };

    return {
      getConversation: getConversationDO,
      sendMessage: sendMessageDO,
      receiveMessage: receiveMessageDO,
    };
  })
);

// Alias for backward compatibility
export const ConversationDOServiceLive = ConversationDOAdapterLive;
