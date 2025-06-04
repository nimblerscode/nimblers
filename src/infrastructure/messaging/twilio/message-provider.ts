import { Effect, Layer } from "effect";
import { MessageProviderService } from "@/domain/global/messaging/service";
import {
  type SendMessageRequest,
  type SendMessageResponse,
  type Message,
  type MessageId,
  type PhoneNumber,
  MessageSendError,
  MessageProviderError,
  MessageValidationError,
  MessageNotFoundError,
} from "@/domain/global/messaging/models";
import { TwilioConfig } from "./config";
import { TwilioApiClient } from "./api-client";

export const TwilioMessageProviderLive = Layer.effect(
  MessageProviderService,
  Effect.gen(function* () {
    const twilioApiClient = yield* TwilioApiClient;
    const config = yield* TwilioConfig;

    const mapTwilioStatusToMessageStatus = (twilioStatus: string): string => {
      switch (twilioStatus.toLowerCase()) {
        case "queued":
        case "accepted":
          return "pending";
        case "sent":
          return "sent";
        case "delivered":
          return "delivered";
        case "failed":
        case "undelivered":
          return "failed";
        case "read":
          return "read";
        default:
          return "pending";
      }
    };

    return {
      sendMessage: (
        request: SendMessageRequest
      ): Effect.Effect<
        SendMessageResponse,
        MessageSendError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          const response = yield* twilioApiClient
            .sendMessage({
              to: request.to,
              from: request.from,
              body: request.content,
              options: {
                statusCallback: config.config.webhookUrl,
                provideFeedback: true,
              },
            })
            .pipe(
              Effect.mapError(
                (error) =>
                  new MessageSendError({
                    message: `Failed to send message via Twilio: ${error.message}`,
                    providerId: "twilio",
                    cause: error,
                  })
              )
            );

          return {
            messageId: response.sid as MessageId,
            status: mapTwilioStatusToMessageStatus(response.status) as any,
            estimatedCost: response.price
              ? Number.parseFloat(response.price)
              : undefined,
            providerId: "twilio",
          };
        }).pipe(Effect.withSpan("TwilioMessageProvider.sendMessage"));
      },

      getMessageStatus: (
        messageId: MessageId
      ): Effect.Effect<
        Message,
        MessageNotFoundError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          const twilioMessage = yield* twilioApiClient
            .getMessage(messageId)
            .pipe(
              Effect.mapError((error) =>
                error.message.includes("not found")
                  ? new MessageNotFoundError({ messageId })
                  : new MessageProviderError({
                      message: `Failed to get message status: ${error.message}`,
                      providerId: "twilio",
                      cause: error,
                    })
              )
            );

          // Determine message type based on content or metadata
          // This is a simplified approach - in practice, you might store this info
          const messageType = twilioMessage.body.startsWith("Template:")
            ? "whatsapp"
            : "sms";

          const message: Message = {
            id: twilioMessage.sid as MessageId,
            to: twilioMessage.to as PhoneNumber,
            from: twilioMessage.from as PhoneNumber,
            content: twilioMessage.body as any,
            type: messageType as any,
            status: mapTwilioStatusToMessageStatus(twilioMessage.status) as any,
            createdAt: twilioMessage.dateCreated,
            updatedAt: twilioMessage.dateUpdated,
            metadata: { providerId: "twilio" },
          };

          return message;
        }).pipe(Effect.withSpan("TwilioMessageProvider.getMessageStatus"));
      },

      validatePhoneNumber: (
        phoneNumber: PhoneNumber
      ): Effect.Effect<boolean, MessageValidationError> => {
        return Effect.gen(function* () {
          // Basic validation first
          const phoneRegex = /^\+[1-9]\d{1,14}$/;
          if (!phoneRegex.test(phoneNumber)) {
            yield* Effect.fail(
              new MessageValidationError({
                message: "Invalid phone number format",
                field: "phoneNumber",
              })
            );
          }

          // Use Twilio's validation if available
          const isValid = yield* twilioApiClient
            .validatePhoneNumber(phoneNumber)
            .pipe(
              Effect.mapError(
                (error) =>
                  new MessageValidationError({
                    message: `Phone number validation failed: ${error.message}`,
                    field: "phoneNumber",
                  })
              )
            );

          return isValid;
        }).pipe(Effect.withSpan("TwilioMessageProvider.validatePhoneNumber"));
      },

      getProviderHealth: (): Effect.Effect<boolean, MessageProviderError> => {
        return Effect.gen(function* () {
          // Simple health check - try to validate a known good number
          const healthCheck = yield* twilioApiClient
            .validatePhoneNumber("+1234567890" as PhoneNumber)
            .pipe(
              Effect.map(() => true),
              Effect.catchAll(() => Effect.succeed(false))
            );

          return healthCheck;
        }).pipe(Effect.withSpan("TwilioMessageProvider.getProviderHealth"));
      },
    };
  })
);
