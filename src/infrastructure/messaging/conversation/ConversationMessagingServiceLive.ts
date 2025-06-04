import { Effect, Layer } from "effect";
import { MessagingService } from "@/domain/tenant/conversations/service";
import { MessageProviderService } from "@/domain/global/messaging/service";
import {
  MessageSendError,
  type SendMessageRequest,
  type PhoneNumber,
} from "@/domain/global/messaging/models";
import type { IncomingMessagePayload } from "@/domain/tenant/conversations/models";

export const ConversationMessagingServiceLive = Layer.effect(
  MessagingService,
  Effect.gen(function* () {
    const messageProvider = yield* MessageProviderService;

    return {
      sendMessage: (
        to: string,
        from: string,
        content: string,
        messageType?: string
      ) =>
        Effect.gen(function* () {
          const request: SendMessageRequest = {
            to: to as PhoneNumber,
            from: from as PhoneNumber,
            content: content as any,
            type: (messageType || "sms") as any,
            metadata: {},
          };

          const response = yield* messageProvider.sendMessage(request).pipe(
            Effect.mapError(
              (error) =>
                new MessageSendError({
                  message: `Failed to send message: ${error.message}`,
                  cause: error,
                })
            )
          );

          return {
            externalMessageId: response.messageId,
            status: "sent" as const,
          };
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              externalMessageId: "failed",
              status: "failed" as const,
            })
          )
        ),

      parseIncomingWebhook: (payload: unknown) =>
        Effect.gen(function* () {
          // Type-safe parsing of webhook payload
          if (typeof payload !== "object" || payload === null) {
            return yield* Effect.fail(
              new Error("Invalid webhook payload: not an object")
            );
          }

          const webhookData = payload as Record<string, any>;

          // Support both Twilio and generic webhook formats
          const parsed: IncomingMessagePayload = {
            externalMessageId:
              webhookData.MessageSid ||
              webhookData.id ||
              `unknown_${Date.now()}`,
            from: webhookData.From || webhookData.from || "unknown",
            to: webhookData.To || webhookData.to || "unknown",
            content: webhookData.Body || webhookData.content || "",
            messageType: webhookData.messageType || "text",
            timestamp: webhookData.timestamp
              ? new Date(webhookData.timestamp)
              : new Date(),
            provider: webhookData.provider || "twilio",
            metadata: webhookData.metadata
              ? JSON.stringify(webhookData.metadata)
              : undefined,
          };

          return parsed;
        }),
    };
  })
);
