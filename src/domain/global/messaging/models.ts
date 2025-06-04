import { Data, Schema as S, Effect } from "effect";

// Phone number value object
export const PhoneNumber = S.String.pipe(
  S.pattern(/^\+[1-9]\d{1,14}$/),
  S.brand("PhoneNumber")
);
export type PhoneNumber = S.Schema.Type<typeof PhoneNumber>;

// Message content
export const MessageContent = S.String.pipe(
  S.minLength(1),
  S.maxLength(1600),
  S.brand("MessageContent")
);
export type MessageContent = S.Schema.Type<typeof MessageContent>;

// Message ID
export const MessageId = S.String.pipe(S.brand("MessageId"));
export type MessageId = S.Schema.Type<typeof MessageId>;

// Message status schema
export const MessageStatusSchema = S.Union(
  S.Literal("pending"),
  S.Literal("sent"),
  S.Literal("delivered"),
  S.Literal("failed"),
  S.Literal("read")
);
export type MessageStatus = S.Schema.Type<typeof MessageStatusSchema>;

// Message type schema
export const MessageTypeSchema = S.Union(
  S.Literal("sms"),
  S.Literal("whatsapp")
);
export type MessageType = S.Schema.Type<typeof MessageTypeSchema>;

// Base message schema
export const BaseMessageSchema = S.Struct({
  id: MessageId,
  to: PhoneNumber,
  from: PhoneNumber,
  content: MessageContent,
  type: MessageTypeSchema,
  status: MessageStatusSchema,
  createdAt: S.Date,
  updatedAt: S.Date,
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type BaseMessage = S.Schema.Type<typeof BaseMessageSchema>;

// SMS specific message schema
export const SMSMessageSchema = S.Struct({
  ...BaseMessageSchema.fields,
  type: S.Literal("sms"),
});
export type SMSMessage = S.Schema.Type<typeof SMSMessageSchema>;

// WhatsApp specific message schema
export const WhatsAppMessageSchema = S.Struct({
  ...BaseMessageSchema.fields,
  type: S.Literal("whatsapp"),
  templateId: S.optional(S.String),
  templateParams: S.optional(S.Record({ key: S.String, value: S.String })),
});
export type WhatsAppMessage = S.Schema.Type<typeof WhatsAppMessageSchema>;

// Union schema for all messages
export const MessageSchema = S.Union(SMSMessageSchema, WhatsAppMessageSchema);
export type Message = S.Schema.Type<typeof MessageSchema>;

// Send message request schema
export const SendMessageRequestSchema = S.Struct({
  to: PhoneNumber,
  from: PhoneNumber,
  content: MessageContent,
  type: MessageTypeSchema,
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  templateId: S.optional(S.String),
  templateParams: S.optional(S.Record({ key: S.String, value: S.String })),
});
export type SendMessageRequest = S.Schema.Type<typeof SendMessageRequestSchema>;

// Send message response schema
export const SendMessageResponseSchema = S.Struct({
  messageId: MessageId,
  status: MessageStatusSchema,
  estimatedCost: S.optional(S.Number),
  providerId: S.optional(S.String),
});
export type SendMessageResponse = S.Schema.Type<
  typeof SendMessageResponseSchema
>;

// Message provider configuration schema
export const MessageProviderConfigSchema = S.Struct({
  accountSid: S.String,
  authToken: S.String,
  fromNumber: PhoneNumber,
  webhookUrl: S.optional(S.String),
});
export type MessageProviderConfig = S.Schema.Type<
  typeof MessageProviderConfigSchema
>;

// =================================
// API Schemas for Infrastructure Layer
// =================================

// API Client Input Schemas
export const ApiSendMessageInputSchema = S.Struct({
  to: PhoneNumber,
  from: PhoneNumber,
  body: MessageContent,
  options: S.optional(
    S.Struct({
      statusCallback: S.optional(S.String),
      provideFeedback: S.optional(S.Boolean),
      mediaUrl: S.optional(S.Array(S.String)),
    })
  ),
});
export type ApiSendMessageInput = S.Schema.Type<
  typeof ApiSendMessageInputSchema
>;

// API Client Output Schemas
export const ApiSendMessageOutputSchema = S.Struct({
  sid: MessageId,
  status: S.String,
  dateCreated: S.Date,
  price: S.optional(S.String),
});
export type ApiSendMessageOutput = S.Schema.Type<
  typeof ApiSendMessageOutputSchema
>;

export const ApiGetMessageOutputSchema = S.Struct({
  sid: MessageId,
  status: S.String,
  body: MessageContent,
  to: PhoneNumber,
  from: PhoneNumber,
  dateCreated: S.Date,
  dateUpdated: S.Date,
});
export type ApiGetMessageOutput = S.Schema.Type<
  typeof ApiGetMessageOutputSchema
>;

// =================================
// Schema Validation Functions
// =================================

// Validation functions that can be used throughout the system
export const validatePhoneNumber = (
  input: unknown
): Effect.Effect<PhoneNumber, MessageValidationError> =>
  S.decodeUnknown(PhoneNumber)(input).pipe(
    Effect.mapError(
      (error) =>
        new MessageValidationError({
          message: `Invalid phone number: ${error.message}`,
          field: "phoneNumber",
        })
    )
  );

export const validateMessageContent = (
  input: unknown
): Effect.Effect<MessageContent, MessageValidationError> =>
  S.decodeUnknown(MessageContent)(input).pipe(
    Effect.mapError(
      (error) =>
        new MessageValidationError({
          message: `Invalid message content: ${error.message}`,
          field: "content",
        })
    )
  );

export const validateMessageId = (
  input: unknown
): Effect.Effect<MessageId, MessageValidationError> =>
  S.decodeUnknown(MessageId)(input).pipe(
    Effect.mapError(
      (error) =>
        new MessageValidationError({
          message: `Invalid message ID: ${error.message}`,
          field: "messageId",
        })
    )
  );

export const validateSendMessageRequest = (
  input: unknown
): Effect.Effect<SendMessageRequest, MessageValidationError> =>
  S.decodeUnknown(SendMessageRequestSchema)(input).pipe(
    Effect.mapError(
      (error) =>
        new MessageValidationError({
          message: `Invalid send message request: ${error.message}`,
        })
    )
  );

export const validateApiSendMessageInput = (
  input: unknown
): Effect.Effect<ApiSendMessageInput, MessageValidationError> =>
  S.decodeUnknown(ApiSendMessageInputSchema)(input).pipe(
    Effect.mapError(
      (error) =>
        new MessageValidationError({
          message: `Invalid API input: ${error.message}`,
        })
    )
  );

// Encoding functions for converting validated data back to plain objects
export const encodeApiSendMessageOutput = (
  output: ApiSendMessageOutput
): unknown => S.encode(ApiSendMessageOutputSchema)(output);

export const encodeApiGetMessageOutput = (
  output: ApiGetMessageOutput
): unknown => S.encode(ApiGetMessageOutputSchema)(output);

// =================================
// Errors
// =================================

export class MessageSendError extends Data.TaggedError("MessageSendError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly providerId?: string;
}> {}

export class MessageValidationError extends Data.TaggedError(
  "MessageValidationError"
)<{
  readonly message: string;
  readonly field?: string;
}> {}

export class MessageProviderError extends Data.TaggedError(
  "MessageProviderError"
)<{
  readonly message: string;
  readonly providerId: string;
  readonly cause?: unknown;
}> {}

export class MessageNotFoundError extends Data.TaggedError(
  "MessageNotFoundError"
)<{
  readonly messageId: MessageId;
}> {}

export class MessageConfigurationError extends Data.TaggedError(
  "MessageConfigurationError"
)<{
  readonly message: string;
  readonly provider: string;
}> {}
