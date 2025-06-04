import { Context, type Effect } from "effect";
import type {
  Message,
  MessageId,
  PhoneNumber,
  SendMessageRequest,
  SendMessageResponse,
  MessageSendError,
  MessageValidationError,
  MessageProviderError,
  MessageNotFoundError,
} from "./models";

// Base Message Provider Service - handles the actual sending via providers like Twilio, MessageBird
export abstract class MessageProviderService extends Context.Tag(
  "@messaging/MessageProviderService"
)<
  MessageProviderService,
  {
    readonly sendMessage: (
      request: SendMessageRequest
    ) => Effect.Effect<
      SendMessageResponse,
      MessageSendError | MessageProviderError
    >;

    readonly getMessageStatus: (
      messageId: MessageId
    ) => Effect.Effect<Message, MessageNotFoundError | MessageProviderError>;

    readonly validatePhoneNumber: (
      phoneNumber: PhoneNumber
    ) => Effect.Effect<boolean, MessageValidationError>;

    readonly getProviderHealth: () => Effect.Effect<
      boolean,
      MessageProviderError
    >;
  }
>() {}

// SMS Service - handles SMS-specific business logic
export abstract class SMSService extends Context.Tag("@messaging/SMSService")<
  SMSService,
  {
    readonly sendSMS: (
      to: PhoneNumber,
      from: PhoneNumber,
      content: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<
      SendMessageResponse,
      MessageSendError | MessageValidationError | MessageProviderError
    >;

    readonly sendBulkSMS: (
      recipients: PhoneNumber[],
      from: PhoneNumber,
      content: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<
      SendMessageResponse[],
      MessageSendError | MessageValidationError | MessageProviderError
    >;

    readonly getDeliveryReport: (
      messageId: MessageId
    ) => Effect.Effect<Message, MessageNotFoundError | MessageProviderError>;
  }
>() {}

// WhatsApp Service - handles WhatsApp-specific business logic
export abstract class WhatsAppService extends Context.Tag(
  "@messaging/WhatsAppService"
)<
  WhatsAppService,
  {
    readonly sendWhatsAppMessage: (
      to: PhoneNumber,
      from: PhoneNumber,
      content: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<
      SendMessageResponse,
      MessageSendError | MessageValidationError | MessageProviderError
    >;

    readonly sendWhatsAppTemplate: (
      to: PhoneNumber,
      from: PhoneNumber,
      templateId: string,
      templateParams: Record<string, string>,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<
      SendMessageResponse,
      MessageSendError | MessageValidationError | MessageProviderError
    >;

    readonly sendBulkWhatsAppMessage: (
      recipients: PhoneNumber[],
      from: PhoneNumber,
      content: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<
      SendMessageResponse[],
      MessageSendError | MessageValidationError | MessageProviderError
    >;

    readonly getWhatsAppDeliveryReport: (
      messageId: MessageId
    ) => Effect.Effect<Message, MessageNotFoundError | MessageProviderError>;

    readonly verifyWhatsAppBusiness: (
      phoneNumber: PhoneNumber
    ) => Effect.Effect<boolean, MessageValidationError>;
  }
>() {}
