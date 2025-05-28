import { Effect, Layer } from "effect";
import { ComplianceLogger } from "@/domain/global/shopify/compliance/service";
import {
  ShopifyWebhookError,
  type WebhookType,
} from "@/domain/global/shopify/compliance/models";

export const ComplianceLoggerLive = Layer.effect(
  ComplianceLogger,
  Effect.gen(function* () {
    return {
      logRequest: (webhookType: WebhookType, payload: unknown) =>
        Effect.gen(function* () {
          // Log the compliance request for audit purposes
          yield* Effect.log(
            `Shopify compliance webhook processed: ${webhookType}`
          );
          yield* Effect.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

          // TODO: Implement persistent logging to database or external service
          // Example:
          // yield* saveComplianceLogToDB({
          //   webhookType,
          //   payload,
          //   timestamp: new Date(),
          //   status: 'processed'
          // });
        }).pipe(
          Effect.withSpan("ComplianceLogger.logRequest"),
          Effect.mapError(
            (error) =>
              new ShopifyWebhookError({
                message: "Failed to log compliance request",
                cause: error,
              })
          )
        ),
    };
  })
);
