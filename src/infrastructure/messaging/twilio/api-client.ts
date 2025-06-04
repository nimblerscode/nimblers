import { Context, Effect, Layer, Schema as S } from "effect";
import {
  MessageProviderError,
  MessageValidationError,
  type ApiSendMessageInput,
  type ApiSendMessageOutput,
  type ApiGetMessageOutput,
  type MessageId,
  type PhoneNumber,
  ApiSendMessageInputSchema,
  ApiSendMessageOutputSchema,
  ApiGetMessageOutputSchema,
  validatePhoneNumber,
  validateMessageId,
} from "@/domain/global/messaging/models";
import type { Twilio } from "twilio";

// Real Twilio SDK dependency
export abstract class TwilioSDKService extends Context.Tag(
  "@messaging/TwilioSDKService"
)<
  TwilioSDKService,
  {
    readonly sdk: Twilio;
  }
>() {}

// Twilio API client abstraction with schema validation
export abstract class TwilioApiClient extends Context.Tag(
  "@messaging/TwilioApiClient"
)<
  TwilioApiClient,
  {
    readonly sendMessage: (
      input: ApiSendMessageInput
    ) => Effect.Effect<
      ApiSendMessageOutput,
      MessageProviderError | MessageValidationError
    >;

    readonly getMessage: (
      messageSid: MessageId
    ) => Effect.Effect<
      ApiGetMessageOutput,
      MessageProviderError | MessageValidationError
    >;

    readonly validatePhoneNumber: (
      phoneNumber: PhoneNumber
    ) => Effect.Effect<boolean, MessageProviderError | MessageValidationError>;
  }
>() {}

export const TwilioApiClientLive = Layer.effect(
  TwilioApiClient,
  Effect.gen(function* () {
    const twilioSDK = yield* TwilioSDKService;

    return {
      sendMessage: (
        input: ApiSendMessageInput
      ): Effect.Effect<
        ApiSendMessageOutput,
        MessageProviderError | MessageValidationError
      > => {
        return Effect.gen(function* () {
          // Validate inputs using schema validation
          const validatedInput = yield* S.decodeUnknown(
            ApiSendMessageInputSchema
          )(input).pipe(
            Effect.mapError(
              (error) =>
                new MessageValidationError({
                  message: `Invalid input parameters: ${error.message}`,
                })
            )
          );

          // Call Twilio SDK with validated data
          const result = yield* Effect.tryPromise({
            try: async () => {
              return await twilioSDK.sdk.messages.create({
                to: validatedInput.to as string, // Convert branded type for Twilio SDK
                from: validatedInput.from as string,
                body: validatedInput.body as string,
                statusCallback: validatedInput.options?.statusCallback,
                provideFeedback: validatedInput.options?.provideFeedback,
                mediaUrl: validatedInput.options?.mediaUrl
                  ? [...validatedInput.options.mediaUrl]
                  : undefined, // Convert readonly array to mutable
              });
            },
            catch: (error) =>
              new MessageProviderError({
                message: `Twilio sendMessage failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                providerId: "twilio",
                cause: error,
              }),
          });

          // Check for Twilio-specific errors
          if (result.errorCode) {
            yield* Effect.fail(
              new MessageProviderError({
                message: `Twilio error ${result.errorCode}: ${result.errorMessage}`,
                providerId: "twilio",
                cause: {
                  errorCode: result.errorCode,
                  errorMessage: result.errorMessage,
                },
              })
            );
          }

          // Validate and return output using schema
          const validatedOutput = yield* S.decodeUnknown(
            ApiSendMessageOutputSchema
          )({
            sid: result.sid,
            status: result.status,
            dateCreated: result.dateCreated,
            price: result.price || undefined,
          }).pipe(
            Effect.mapError(
              (error) =>
                new MessageValidationError({
                  message: `Invalid Twilio response: ${error.message}`,
                })
            )
          );

          return validatedOutput;
        }).pipe(Effect.withSpan("TwilioApiClient.sendMessage"));
      },

      getMessage: (
        messageSid: MessageId
      ): Effect.Effect<
        ApiGetMessageOutput,
        MessageProviderError | MessageValidationError
      > => {
        return Effect.gen(function* () {
          // Validate message ID input
          yield* validateMessageId(messageSid);

          // Call Twilio SDK
          const result = yield* Effect.tryPromise({
            try: async () => {
              return await twilioSDK.sdk.messages(messageSid as string).fetch();
            },
            catch: (error) =>
              new MessageProviderError({
                message: `Twilio getMessage failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                providerId: "twilio",
                cause: error,
              }),
          });

          // Check for Twilio-specific errors
          if (result.errorCode) {
            yield* Effect.fail(
              new MessageProviderError({
                message: `Twilio error ${result.errorCode}: ${result.errorMessage}`,
                providerId: "twilio",
                cause: {
                  errorCode: result.errorCode,
                  errorMessage: result.errorMessage,
                },
              })
            );
          }

          // Validate and return output using schema
          const validatedOutput = yield* S.decodeUnknown(
            ApiGetMessageOutputSchema
          )({
            sid: result.sid,
            status: result.status,
            body: result.body,
            to: result.to,
            from: result.from,
            dateCreated: result.dateCreated,
            dateUpdated: result.dateUpdated,
          }).pipe(
            Effect.mapError(
              (error) =>
                new MessageValidationError({
                  message: `Invalid Twilio response: ${error.message}`,
                })
            )
          );

          return validatedOutput;
        }).pipe(Effect.withSpan("TwilioApiClient.getMessage"));
      },

      validatePhoneNumber: (
        phoneNumber: PhoneNumber
      ): Effect.Effect<
        boolean,
        MessageProviderError | MessageValidationError
      > => {
        return Effect.gen(function* () {
          // Use domain validation function
          yield* validatePhoneNumber(phoneNumber);

          // Use Twilio's validation API
          const result = yield* Effect.tryPromise({
            try: async () => {
              return await twilioSDK.sdk.lookups.v1
                .phoneNumbers(phoneNumber as string)
                .fetch();
            },
            catch: (error) =>
              new MessageProviderError({
                message: `Twilio validatePhoneNumber failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                providerId: "twilio",
                cause: error,
              }),
          });

          // If the lookup succeeds without error, the phone number is valid
          return true;
        }).pipe(Effect.withSpan("TwilioApiClient.validatePhoneNumber"));
      },
    };
  })
);
