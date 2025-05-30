import { Effect, Layer } from "effect";
import {
  type AccessToken,
  OAuthError,
  type ShopDomain,
} from "@/domain/shopify/oauth/models";
import { WebhookService } from "@/domain/shopify/oauth/service";

export const WebhookServiceLive = Layer.effect(
  WebhookService,
  Effect.gen(function* () {
    return {
      registerAppUninstallWebhook: (
        shop: ShopDomain,
        accessToken: AccessToken,
        webhookUrl: string
      ) =>
        Effect.gen(function* () {
          const webhookEndpoint = `https://${shop}/admin/api/2024-04/webhooks.json`;

          const payload = {
            webhook: {
              topic: "app/uninstalled",
              address: webhookUrl,
              format: "json",
            },
          };

          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(webhookEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": accessToken,
                },
                body: JSON.stringify(payload),
              }),
            catch: (error) =>
              new OAuthError({
                message: "Failed to register app uninstall webhook",
                cause: error,
              }),
          });

          if (!response.ok) {
            const errorText = yield* Effect.tryPromise({
              try: () => response.text(),
              catch: (_error) =>
                new OAuthError({
                  message: "Failed to read error response",
                }),
            }).pipe(Effect.catchAll(() => Effect.succeed("Unknown error")));

            return yield* Effect.fail(
              new OAuthError({
                message: `Webhook registration failed with status ${response.status}: ${errorText}`,
              })
            );
          }

          // Successfully registered webhook - return void
        }),
    };
  })
);
