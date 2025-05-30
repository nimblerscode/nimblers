import { Context, Effect, Layer, Schema as S } from "effect";
import {
  type AppUninstalledWebhook,
  AppUninstalledWebhookSchema,
  ShopifyWebhookHeaders,
  WebhookProcessingError,
  type WebhookProcessingResult,
} from "@/domain/shopify/webhooks/models";
import {
  ShopifyWebhookUseCase,
  ShopifyWebhookVerifier,
} from "@/domain/shopify/webhooks/service";
import { ConnectedStoreRepo } from "@/domain/tenant/organization/service";

// Environment for webhook secret
export abstract class ShopifyWebhookEnv extends Context.Tag(
  "@infrastructure/shopify/webhooks/Env"
)<
  ShopifyWebhookEnv,
  {
    SHOPIFY_WEBHOOK_SECRET: string;
  }
>() {}

export const ShopifyWebhookUseCaseLive = Layer.effect(
  ShopifyWebhookUseCase,
  Effect.gen(function* () {
    const webhookVerifier = yield* ShopifyWebhookVerifier;
    const connectedStoreRepo = yield* ConnectedStoreRepo;
    const env = yield* ShopifyWebhookEnv;

    const processAppUninstall = (
      shopDomain: string,
      webhookData: AppUninstalledWebhook
    ) =>
      Effect.gen(function* () {
        // Log app uninstall details for audit purposes
        yield* Effect.logInfo("Processing app uninstall webhook").pipe(
          Effect.annotateLogs({
            shopDomain,
            shopName: webhookData.name,
            shopOwner: webhookData.shop_owner,
            planName: webhookData.plan_name,
            myshopifyDomain: webhookData.myshopify_domain,
            createdAt: webhookData.created_at,
          })
        );

        // Update connected store status to "disconnected"
        const connectedStore = yield* connectedStoreRepo
          .getByShopDomain(shopDomain)
          .pipe(
            Effect.mapError(
              (error) =>
                new WebhookProcessingError({
                  message: "Failed to find connected store",
                  cause: error,
                })
            )
          );

        if (connectedStore) {
          // Mark store as disconnected
          yield* connectedStoreRepo
            .updateStatus(connectedStore.id, "disconnected")
            .pipe(
              Effect.mapError(
                (error) =>
                  new WebhookProcessingError({
                    message: "Failed to update store status",
                    cause: error,
                  })
              )
            );

          yield* Effect.logInfo(
            "Successfully marked store as disconnected"
          ).pipe(
            Effect.annotateLogs({
              shopDomain,
              connectedStoreId: connectedStore.id,
            })
          );
        } else {
          yield* Effect.logWarning(
            "No connected store found for app uninstall"
          ).pipe(
            Effect.annotateLogs({
              shopDomain,
              shopName: webhookData.name,
            })
          );
        }

        // Note: OAuth token cleanup would require additional service implementation
        // For now, marking the store as disconnected is sufficient for UI purposes

        return {
          success: true,
          message: `App successfully uninstalled for shop: ${shopDomain}`,
          shopDomain,
        } satisfies WebhookProcessingResult;
      }).pipe(Effect.withSpan("ShopifyWebhookUseCase.processAppUninstall"));

    return {
      handleAppUninstalled: (request: Request) =>
        Effect.gen(function* () {
          // Extract headers
          const rawHeaders = Object.fromEntries(request.headers.entries());
          const headers = yield* S.decodeUnknown(ShopifyWebhookHeaders)(
            rawHeaders
          ).pipe(
            Effect.mapError(
              (error) =>
                new WebhookProcessingError({
                  message: "Invalid webhook headers",
                  cause: error,
                })
            )
          );

          // Get request body
          const body = yield* Effect.tryPromise({
            try: () => request.text(),
            catch: (error) =>
              new WebhookProcessingError({
                message: "Failed to read request body",
                cause: error,
              }),
          });

          // Verify webhook HMAC
          const isValid = yield* webhookVerifier
            .verifyWebhook(body, headers, env.SHOPIFY_WEBHOOK_SECRET)
            .pipe(
              Effect.mapError(
                (error) =>
                  new WebhookProcessingError({
                    message: "Webhook verification failed",
                    cause: error,
                  })
              )
            );

          if (!isValid) {
            return yield* Effect.fail(
              new WebhookProcessingError({
                message: "Invalid webhook signature",
              })
            );
          }

          // Parse webhook payload
          const webhookData = yield* Effect.tryPromise({
            try: () => JSON.parse(body),
            catch: (error) =>
              new WebhookProcessingError({
                message: "Failed to parse webhook payload",
                cause: error,
              }),
          });

          const appUninstallData = yield* S.decodeUnknown(
            AppUninstalledWebhookSchema
          )(webhookData).pipe(
            Effect.mapError(
              (error) =>
                new WebhookProcessingError({
                  message: "Invalid app uninstall payload",
                  cause: error,
                })
            )
          );

          // Process the app uninstall
          const shopDomain = headers["X-Shopify-Shop-Domain"];
          return yield* processAppUninstall(shopDomain, appUninstallData);
        }).pipe(Effect.withSpan("ShopifyWebhookUseCase.handleAppUninstalled")),

      processAppUninstall,
    };
  })
);
