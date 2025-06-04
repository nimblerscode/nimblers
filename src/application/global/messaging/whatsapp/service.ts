import { Effect, Layer } from "effect";
import {
  MessageContent,
  type PhoneNumber,
} from "@/domain/global/messaging/models";
import {
  MessageProviderService,
  WhatsAppService,
} from "@/domain/global/messaging/service";
import {
  type SendMessageResponse,
  type MessageSendError,
  MessageValidationError,
  type MessageProviderError,
  type Message,
  type MessageId,
  MessageNotFoundError,
} from "@/domain/global/messaging/models";

export const WhatsAppServiceLive = Layer.effect(
  WhatsAppService,
  Effect.gen(function* () {
    const messageProvider = yield* MessageProviderService;

    return {
      sendWhatsAppMessage: (
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
          const messageContent = yield* Effect.try({
            try: () => MessageContent.make(content),
            catch: (error) =>
              new MessageValidationError({
                message: `Invalid message content: ${error}`,
                field: "content",
              }),
          });

          // Send WhatsApp message via provider
          const response = yield* messageProvider.sendMessage({
            to,
            from,
            content: messageContent,
            type: "whatsapp" as const,
            metadata,
          });

          return response;
        }).pipe(Effect.withSpan("WhatsAppService.sendWhatsAppMessage"));
      },

      sendWhatsAppTemplate: (
        to: PhoneNumber,
        from: PhoneNumber,
        templateId: string,
        templateParams: Record<string, string>,
        metadata?: Record<string, unknown>
      ): Effect.Effect<
        SendMessageResponse,
        MessageSendError | MessageValidationError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          // Validate phone numbers first
          yield* messageProvider.validatePhoneNumber(to);
          yield* messageProvider.validatePhoneNumber(from);

          // For templates, we use a placeholder content
          const messageContent = yield* Effect.try({
            try: () => MessageContent.make(`Template: ${templateId}`),
            catch: (error) =>
              new MessageValidationError({
                message: `Invalid template: ${error}`,
                field: "templateId",
              }),
          });

          // Send WhatsApp template via provider
          const response = yield* messageProvider.sendMessage({
            to,
            from,
            content: messageContent,
            type: "whatsapp" as const,
            templateId,
            templateParams,
            metadata,
          });

          return response;
        }).pipe(Effect.withSpan("WhatsAppService.sendWhatsAppTemplate"));
      },

      sendBulkWhatsAppMessage: (
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
          const messageContent = yield* Effect.try({
            try: () => MessageContent.make(content),
            catch: (error) =>
              new MessageValidationError({
                message: `Invalid message content: ${error}`,
                field: "content",
              }),
          });

          // Send to all recipients in parallel
          const sendPromises = recipients.map((to) =>
            messageProvider.sendMessage({
              to,
              from,
              content: messageContent,
              type: "whatsapp" as const,
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
        }).pipe(Effect.withSpan("WhatsAppService.sendBulkWhatsAppMessage"));
      },

      getWhatsAppDeliveryReport: (
        messageId: MessageId
      ): Effect.Effect<
        Message,
        MessageNotFoundError | MessageProviderError
      > => {
        return Effect.gen(function* () {
          const message = yield* messageProvider.getMessageStatus(messageId);

          // Ensure it's a WhatsApp message
          if (message.type !== "whatsapp") {
            yield* Effect.fail(new MessageNotFoundError({ messageId }));
          }

          return message;
        }).pipe(Effect.withSpan("WhatsAppService.getWhatsAppDeliveryReport"));
      },

      verifyWhatsAppBusiness: (
        phoneNumber: PhoneNumber
      ): Effect.Effect<boolean, MessageValidationError> => {
        return Effect.gen(function* () {
          // Validate the phone number format first
          yield* messageProvider.validatePhoneNumber(phoneNumber);

          // For WhatsApp Business, we might need additional validation
          // This is a simplified implementation - in practice, you'd call WhatsApp Business API
          const isValid = yield* Effect.succeed(true);

          return isValid;
        }).pipe(Effect.withSpan("WhatsAppService.verifyWhatsAppBusiness"));
      },
    };
  })
);
