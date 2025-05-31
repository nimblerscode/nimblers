import { Effect, pipe } from "effect";
import { ShopifyComplianceLayerLive } from "@/config/shopify";
import type { WebhookType } from "@/domain/shopify/compliance/models";
import { ShopifyComplianceUseCase } from "@/domain/shopify/compliance/service";

export class ComplianceWebhookApplicationService {
  static handleShopifyComplianceWebhook = (
    webhookType: WebhookType,
    request: Request,
    secret: string
  ): Effect.Effect<Response, never> =>
    pipe(
      Effect.gen(function* () {
        if (!secret) {
          yield* Effect.log(
            "Missing SHOPIFY_WEBHOOK_SECRET environment variable"
          );
          return new Response("Server configuration error", { status: 500 });
        }

        const complianceService = yield* ShopifyComplianceUseCase;
        yield* complianceService.handleWebhook(webhookType, request, secret);

        // Log successful webhook processing
        yield* Effect.log(
          `Shopify compliance webhook processed successfully: ${webhookType}`
        );

        return new Response("OK", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Log error for debugging and audit purposes
          yield* Effect.log(
            `Shopify compliance webhook error (${webhookType}): ${
              error._tag || String(error)
            }`
          );

          // Handle different error types using Effect-TS tagged errors
          if (error && typeof error === "object" && "_tag" in error) {
            switch (error._tag) {
              case "InvalidHmacError":
                return new Response("Unauthorized: Invalid HMAC signature", {
                  status: 401,
                  headers: { "Content-Type": "text/plain" },
                });

              case "WebhookProcessingError":
                return new Response("Bad Request: Invalid webhook data", {
                  status: 400,
                  headers: { "Content-Type": "text/plain" },
                });

              default:
                // Fallback for any other tagged errors
                return new Response("Internal Server Error", {
                  status: 500,
                  headers: { "Content-Type": "text/plain" },
                });
            }
          }

          // Fallback for any unexpected errors
          return new Response("Internal Server Error", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          });
        })
      ),
      Effect.provide(ShopifyComplianceLayerLive)
    );
}
