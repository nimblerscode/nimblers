import { Context, type Effect } from "effect";
import type { ShopDomain } from "@/domain/global/organization/models";
import type {
  AppUninstalledWebhook,
  ShopifyWebhookHeaders,
  WebhookProcessingError,
  WebhookProcessingResult,
  WebhookVerificationError,
} from "./models";

// Webhook verification service
export abstract class ShopifyWebhookVerifier extends Context.Tag(
  "@core/shopify/webhooks/Verifier",
)<
  ShopifyWebhookVerifier,
  {
    readonly verifyWebhook: (
      body: string,
      headers: ShopifyWebhookHeaders,
      secret: string,
    ) => Effect.Effect<boolean, WebhookVerificationError>;
  }
>() {}

// Webhook processing use case
export abstract class ShopifyWebhookUseCase extends Context.Tag(
  "@core/shopify/webhooks/UseCase",
)<
  ShopifyWebhookUseCase,
  {
    readonly handleAppUninstalled: (
      request: Request,
    ) => Effect.Effect<WebhookProcessingResult, WebhookProcessingError>;
    readonly processAppUninstall: (
      shopDomain: ShopDomain,
      webhookData: AppUninstalledWebhook,
    ) => Effect.Effect<WebhookProcessingResult, WebhookProcessingError>;
  }
>() {}
