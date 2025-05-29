import { Effect, Layer, Schema as S } from "effect";
import {
  CustomerDataRequestPayloadSchema,
  CustomerRedactPayloadSchema,
  InvalidHmacError,
  ShopRedactPayloadSchema,
  WebhookProcessingError,
  type WebhookType,
} from "@/domain/global/shopify/compliance/models";
import {
  ComplianceDataRepo,
  ComplianceLogger,
  ShopifyComplianceUseCase,
  ShopifyHmacVerifier,
} from "@/domain/global/shopify/compliance/service";

export const ShopifyComplianceUseCaseLive = Layer.effect(
  ShopifyComplianceUseCase,
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyHmacVerifier;
    const dataRepo = yield* ComplianceDataRepo;
    const logger = yield* ComplianceLogger;

    return {
      handleWebhook: (
        webhookType: WebhookType,
        request: Request,
        secret: string,
      ) =>
        Effect.gen(function* () {
          if (!request) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "Request parameter is undefined in use case",
              }),
            );
          }

          // Step 1: Verify HMAC signature
          // This will either succeed with true/false or fail with InvalidHmacError
          const isValid = yield* hmacVerifier.verify(request, secret);
          if (!isValid) {
            return yield* Effect.fail(
              new InvalidHmacError({
                message: "HMAC signature verification failed",
              }),
            );
          }

          // Step 2: Parse and validate payload
          const rawPayload = yield* Effect.tryPromise({
            try: () => request.json(),
            catch: (error) =>
              new WebhookProcessingError({
                message: "Failed to parse JSON payload",
                webhookType,
                cause: error,
              }),
          });

          // Step 3: Handle based on webhook type
          yield* Effect.gen(function* () {
            switch (webhookType) {
              case "customers-data-request": {
                const payload = yield* S.decodeUnknown(
                  CustomerDataRequestPayloadSchema,
                )(rawPayload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Invalid customer data request payload",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* dataRepo.retrieveCustomerData(payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to retrieve customer data",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* logger.logRequest(webhookType, payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to log compliance request",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                break;
              }

              case "customers-data-erasure": {
                const payload = yield* S.decodeUnknown(
                  CustomerRedactPayloadSchema,
                )(rawPayload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Invalid customer redact payload",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* dataRepo.deleteCustomerData(payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to delete customer data",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* logger.logRequest(webhookType, payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to log compliance request",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                break;
              }

              case "shop-data-erasure": {
                const payload = yield* S.decodeUnknown(ShopRedactPayloadSchema)(
                  rawPayload,
                ).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Invalid shop redact payload",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* dataRepo.deleteShopData(payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to delete shop data",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                yield* logger.logRequest(webhookType, payload).pipe(
                  Effect.mapError(
                    (error) =>
                      new WebhookProcessingError({
                        message: "Failed to log compliance request",
                        webhookType,
                        cause: error,
                      }),
                  ),
                );
                break;
              }

              default:
                return yield* Effect.fail(
                  new WebhookProcessingError({
                    message: `Unknown webhook type: ${webhookType}`,
                    webhookType,
                  }),
                );
            }
          });
        }).pipe(
          Effect.withSpan(
            `ShopifyComplianceUseCase.handleWebhook.${webhookType}`,
          ),
        ),
    };
  }),
);
