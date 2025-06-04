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

import { TwilioConfig } from "./config";

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

    readonly healthCheck: () => Effect.Effect<boolean, MessageProviderError>;
  }
>() {}

// Fetch-based Twilio API client implementation
export const TwilioApiClientLive = Layer.effect(
  TwilioApiClient,
  Effect.gen(function* () {
    const config = yield* TwilioConfig;

    // Helper function to create Twilio API requests
    const createTwilioRequest = (
      endpoint: string,
      method: string,
      body?: URLSearchParams
    ): Request => {
      const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
      const url = `${baseUrl}${endpoint}`;

      // Create Basic Auth token
      const token = btoa(`${config.accountSid}:${config.authToken}`);

      const headers = new Headers({
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      });

      return new Request(url, {
        method,
        headers,
        body: body?.toString(),
      });
    };

    // Helper function to handle Twilio API responses
    const handleTwilioResponse = async (response: Response) => {
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new MessageProviderError({
          message: `Twilio API error ${response.status}: ${
            errorData.message || response.statusText
          }`,
          providerId: "twilio",
          cause: {
            status: response.status,
            code: errorData.code,
            message: errorData.message,
            moreInfo: errorData.more_info,
          },
        });
      }

      return (await response.json()) as any;
    };

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

          // Create form data for Twilio API
          const formData = new URLSearchParams({
            To: validatedInput.to as string,
            From: validatedInput.from as string,
            Body: validatedInput.body as string,
          });

          // Add optional parameters
          if (validatedInput.options?.statusCallback) {
            formData.append(
              "StatusCallback",
              validatedInput.options.statusCallback
            );
          }
          if (validatedInput.options?.provideFeedback !== undefined) {
            formData.append(
              "ProvideFeedback",
              validatedInput.options.provideFeedback.toString()
            );
          }
          if (validatedInput.options?.mediaUrl) {
            validatedInput.options.mediaUrl.forEach((url) => {
              formData.append("MediaUrl", url);
            });
          }

          // Make API call using fetch
          const result = yield* Effect.tryPromise({
            try: async () => {
              const request = createTwilioRequest(
                "/Messages.json",
                "POST",
                formData
              );
              const response = await fetch(request);
              return await handleTwilioResponse(response);
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

          // Validate and return output using schema
          const validatedOutput = yield* S.decodeUnknown(
            ApiSendMessageOutputSchema
          )({
            sid: result.sid,
            status: result.status,
            dateCreated: new Date(result.date_created),
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

          // Make API call using fetch
          const result = yield* Effect.tryPromise({
            try: async () => {
              const request = createTwilioRequest(
                `/Messages/${messageSid as string}.json`,
                "GET"
              );
              const response = await fetch(request);
              return await handleTwilioResponse(response);
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

          // Validate and return output using schema
          const validatedOutput = yield* S.decodeUnknown(
            ApiGetMessageOutputSchema
          )({
            sid: result.sid,
            status: result.status,
            body: result.body,
            to: result.to,
            from: result.from,
            dateCreated: new Date(result.date_created),
            dateUpdated: new Date(result.date_updated),
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
          // Use domain validation function first
          yield* validatePhoneNumber(phoneNumber);

          // Use Twilio's Lookup API v1 for validation
          const result = yield* Effect.tryPromise({
            try: async () => {
              const baseUrl = `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(
                phoneNumber as string
              )}`;
              const token = btoa(`${config.accountSid}:${config.authToken}`);

              const response = await fetch(baseUrl, {
                method: "GET",
                headers: {
                  Authorization: `Basic ${token}`,
                },
              });

              if (!response.ok) {
                // If phone number is invalid, Twilio returns 404
                if (response.status === 404) {
                  return { valid: false };
                }

                const errorData = (await response
                  .json()
                  .catch(() => ({}))) as any;
                throw new MessageProviderError({
                  message: `Twilio Lookup API error ${response.status}: ${
                    errorData.message || response.statusText
                  }`,
                  providerId: "twilio",
                  cause: errorData,
                });
              }

              return (await response.json()) as any;
            },
            catch: (error) => {
              if (error instanceof MessageProviderError) {
                return error;
              }
              return new MessageProviderError({
                message: `Twilio validatePhoneNumber failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                providerId: "twilio",
                cause: error,
              });
            },
          });

          // If we got an error object, re-throw it
          if (result instanceof MessageProviderError) {
            yield* Effect.fail(result);
          }

          // If the lookup succeeds without error, the phone number is valid
          return result.valid !== false;
        }).pipe(Effect.withSpan("TwilioApiClient.validatePhoneNumber"));
      },

      healthCheck: (): Effect.Effect<boolean, MessageProviderError> => {
        return Effect.gen(function* () {
          // Simple health check: try to get account info
          const result = yield* Effect.tryPromise({
            try: async () => {
              const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`;
              const token = btoa(`${config.accountSid}:${config.authToken}`);

              const response = await fetch(baseUrl, {
                method: "GET",
                headers: {
                  Authorization: `Basic ${token}`,
                },
              });

              return response.ok;
            },
            catch: (error) =>
              new MessageProviderError({
                message: `Twilio health check failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                providerId: "twilio",
                cause: error,
              }),
          });

          return result;
        }).pipe(Effect.withSpan("TwilioApiClient.healthCheck"));
      },
    };
  })
);
