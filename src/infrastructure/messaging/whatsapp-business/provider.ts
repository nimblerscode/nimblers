import { Effect, Layer } from "effect";
import {
  type SendMessageRequest,
  type SendMessageResponse,
  MessageSendError,
  MessageValidationError,
  MessageNotFoundError,
  type MessageId,
  type PhoneNumber,
  WhatsAppTemplateMessage,
  WhatsAppProviderError,
} from "@/domain/global/messaging/models";
import { MessageProviderService } from "@/domain/global/messaging/service";
import { WhatsAppBusinessAPIConfig } from "./config";

/**
 * WhatsApp Business Message Provider - implements MessageProviderService interface
 */
export const WhatsAppBusinessMessageProviderLive = Layer.effect(
  MessageProviderService,
  Effect.gen(function* () {
    const config = yield* WhatsAppBusinessAPIConfig;

    const makeWhatsAppRequest = (
      body: unknown
    ): Effect.Effect<{ messages: Array<{ id: string }> }, MessageSendError> =>
      Effect.gen(function* () {
        const url = `https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`;

        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            }),
          catch: (error) =>
            new MessageSendError({
              message: `Network error: ${String(error)}`,
              providerId: "whatsapp-business",
            }),
        });

        if (!response.ok) {
          const errorText = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () =>
              new MessageSendError({
                message: "Failed to read error response",
                providerId: "whatsapp-business",
              }),
          });

          yield* Effect.logError("🔍 WhatsApp: API Error Response", {
            status: response.status,
            statusText: response.statusText,
            errorText,
            url: response.url,
          });

          return yield* Effect.fail(
            new MessageSendError({
              message: `WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`,
              providerId: "whatsapp-business",
            })
          );
        }

        const data = yield* Effect.tryPromise({
          try: () =>
            response.json() as Promise<{ messages: Array<{ id: string }> }>,
          catch: (error) =>
            new MessageSendError({
              message: `Failed to parse response: ${String(error)}`,
              providerId: "whatsapp-business",
            }),
        });

        return data;
      });

    return {
      sendMessage: (
        request: SendMessageRequest
      ): Effect.Effect<SendMessageResponse, MessageSendError> =>
        Effect.gen(function* () {
          // Validate that this is a WhatsApp message
          if (request.type !== "whatsapp") {
            return yield* Effect.fail(
              new MessageSendError({
                message: "WhatsApp provider can only send WhatsApp messages",
                providerId: "whatsapp-business",
              })
            );
          }

          // Handle template messages
          if (request.templateId) {
            const template: WhatsAppTemplateMessage = {
              name: request.templateId,
              language: { code: "en_US" }, // TODO: Make configurable
              ...(request.templateParams && {
                components: [
                  {
                    type: "body",
                    parameters: Object.entries(request.templateParams).map(
                      ([_, value]) => ({
                        type: "text",
                        text: value,
                      })
                    ),
                  },
                ],
              }),
            };

            const payload = {
              messaging_product: "whatsapp",
              to: request.to,
              type: "template",
              template,
            };

            const response = yield* makeWhatsAppRequest(payload);

            if (!response.messages?.[0]?.id) {
              return yield* Effect.fail(
                new MessageSendError({
                  message: "No message ID returned from WhatsApp API",
                  providerId: "whatsapp-business",
                })
              );
            }

            return {
              messageId: response.messages[0].id as MessageId,
              status: "pending" as const,
              estimatedCost: 0.0, // WhatsApp pricing varies
              providerId: "whatsapp-business",
            };
          }

          // Handle regular text messages
          const payload = {
            messaging_product: "whatsapp",
            to: request.to,
            type: "text",
            text: { body: request.content },
          };

          yield* Effect.logInfo("🔍 WhatsApp: About to send message", {
            to: request.to,
            contentLength: request.content.length,
            payload: JSON.stringify(payload),
          });

          const response = yield* makeWhatsAppRequest(payload);

          yield* Effect.logInfo("🔍 WhatsApp: API Response received", {
            hasMessages: !!response.messages,
            messageCount: response.messages?.length || 0,
            firstMessageId: response.messages?.[0]?.id,
            fullResponse: JSON.stringify(response),
          });

          if (!response.messages?.[0]?.id) {
            yield* Effect.logError("🔍 WhatsApp: No message ID in response", {
              response: JSON.stringify(response),
            });
            return yield* Effect.fail(
              new MessageSendError({
                message: "No message ID returned from WhatsApp API",
                providerId: "whatsapp-business",
              })
            );
          }

          yield* Effect.logInfo("🔍 WhatsApp: Message sent successfully", {
            messageId: response.messages[0].id,
            to: request.to,
          });

          return {
            messageId: response.messages[0].id as MessageId,
            status: "pending" as const,
            estimatedCost: 0.0, // WhatsApp pricing varies
            providerId: "whatsapp-business",
          };
        }).pipe(Effect.withSpan("WhatsAppBusinessProvider.sendMessage")),

      getMessageStatus: (messageId: MessageId) =>
        Effect.gen(function* () {
          // WhatsApp Business API doesn't provide message status lookup
          // Status updates come via webhooks
          return yield* Effect.fail(
            new MessageNotFoundError({
              messageId,
            })
          );
        }).pipe(Effect.withSpan("WhatsAppBusinessProvider.getMessageStatus")),

      validatePhoneNumber: (phoneNumber: PhoneNumber) =>
        Effect.gen(function* () {
          // Basic E.164 validation for WhatsApp
          const isValid = /^\+[1-9]\d{1,14}$/.test(phoneNumber);
          if (!isValid) {
            return yield* Effect.fail(
              new MessageValidationError({
                message:
                  "Invalid WhatsApp phone number format. Must be E.164 format (e.g., +1234567890)",
                field: "phoneNumber",
              })
            );
          }
          return true;
        }).pipe(
          Effect.withSpan("WhatsAppBusinessProvider.validatePhoneNumber")
        ),

      getProviderHealth: () =>
        Effect.succeed(!!(config.accessToken && config.phoneNumberId)).pipe(
          Effect.withSpan("WhatsAppBusinessProvider.getProviderHealth")
        ),
    };
  })
);

/**
 * WhatsApp Webhook Verification Helper
 */
export const verifyWhatsAppWebhook = (
  mode: string,
  token: string,
  challenge: string,
  verifyToken: string
): Effect.Effect<string, WhatsAppProviderError> =>
  Effect.gen(function* () {
    if (mode === "subscribe" && token === verifyToken) {
      return challenge;
    }

    return yield* Effect.fail(
      new WhatsAppProviderError({
        message: "Webhook verification failed",
        code: "WEBHOOK_VERIFICATION_FAILED",
      })
    );
  }).pipe(Effect.withSpan("WhatsAppBusiness.verifyWebhook"));
