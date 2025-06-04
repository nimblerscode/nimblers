import { Effect, Layer } from "effect";
import {
  type PhoneNumber,
  validateMessageContent,
} from "@/domain/global/messaging/models";
import {
  MessageProviderService,
  SMSService,
} from "@/domain/global/messaging/service";
import {
  type SendMessageResponse,
  type MessageSendError,
  type MessageValidationError,
  type MessageProviderError,
  type Message,
  type MessageId,
  MessageNotFoundError,
} from "@/domain/global/messaging/models";

export const SMSServiceLive: Layer.Layer<
  SMSService,
  never,
  MessageProviderService
> = Layer.effect(
  SMSService,
  Effect.gen(function* () {
    const messageProvider = yield* MessageProviderService;

    return {
      sendSMS: (
        to: PhoneNumber,
        from: PhoneNumber,
        content: string,
        metadata?: Record<string, unknown>
      ): Effect.Effect<
        SendMessageResponse,
        MessageSendError | MessageValidationError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          // Validate phone numbers first
          yield* messageProvider.validatePhoneNumber(to);
          yield* messageProvider.validatePhoneNumber(from);

          // Create message content with validation
          const messageContent = yield* validateMessageContent(content);

          // Send SMS via provider
          const response = yield* messageProvider.sendMessage({
            to,
            from,
            content: messageContent,
            type: "sms" as const,
            metadata,
          });

          return response;
        }).pipe(Effect.withSpan("SMSService.sendSMS"));
      },

      sendBulkSMS: (
        recipients: PhoneNumber[],
        from: PhoneNumber,
        content: string,
        metadata?: Record<string, unknown>
      ): Effect.Effect<
        SendMessageResponse[],
        MessageSendError | MessageValidationError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          // Validate sender phone number
          yield* messageProvider.validatePhoneNumber(from);

          // Create message content with validation
          const messageContent = yield* validateMessageContent(content);

          // Send to all recipients in parallel
          const sendPromises = recipients.map((to) =>
            messageProvider.sendMessage({
              to,
              from,
              content: messageContent,
              type: "sms" as const,
              metadata: {
                ...metadata,
                bulkMessageId: crypto.randomUUID(),
              },
            })
          );

          const responses = yield* Effect.all(sendPromises, {
            concurrency: "inherit",
          });
          return responses;
        }).pipe(Effect.withSpan("SMSService.sendBulkSMS"));
      },

      getDeliveryReport: (
        messageId: MessageId
      ): Effect.Effect<
        Message,
        MessageNotFoundError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          const message = yield* messageProvider.getMessageStatus(messageId);

          // Ensure it's an SMS message
          if (message.type !== "sms") {
            yield* Effect.fail(new MessageNotFoundError({ messageId }));
          }

          return message;
        }).pipe(Effect.withSpan("SMSService.getDeliveryReport"));
      },
    };
  })
);
