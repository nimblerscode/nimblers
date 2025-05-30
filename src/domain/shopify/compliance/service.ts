import { Context, type Effect } from "effect";
import type {
  CustomerDataRequestPayload,
  CustomerRedactPayload,
  InvalidHmacError,
  ShopifyWebhookError,
  ShopRedactPayload,
  WebhookProcessingError,
  WebhookType,
} from "./models";

// === HMAC Verification Service ===
export abstract class ShopifyHmacVerifier extends Context.Tag(
  "@core/shopify/HmacVerifier",
)<
  ShopifyHmacVerifier,
  {
    readonly verify: (
      request: Request,
      secret: string,
    ) => Effect.Effect<boolean, InvalidHmacError>;
  }
>() {}

// === Compliance Data Handler Repository ===
export abstract class ComplianceDataRepo extends Context.Tag(
  "@core/shopify/ComplianceDataRepo",
)<
  ComplianceDataRepo,
  {
    readonly retrieveCustomerData: (
      payload: CustomerDataRequestPayload,
    ) => Effect.Effect<unknown, ShopifyWebhookError>;

    readonly deleteCustomerData: (
      payload: CustomerRedactPayload,
    ) => Effect.Effect<void, ShopifyWebhookError>;

    readonly deleteShopData: (
      payload: ShopRedactPayload,
    ) => Effect.Effect<void, ShopifyWebhookError>;
  }
>() {}

// === Compliance Logging Service ===
export abstract class ComplianceLogger extends Context.Tag(
  "@core/shopify/ComplianceLogger",
)<
  ComplianceLogger,
  {
    readonly logRequest: (
      webhookType: WebhookType,
      payload: unknown,
    ) => Effect.Effect<void, ShopifyWebhookError>;
  }
>() {}

// === Shopify Compliance Use Case ===
export abstract class ShopifyComplianceUseCase extends Context.Tag(
  "@core/shopify/ComplianceUseCase",
)<
  ShopifyComplianceUseCase,
  {
    readonly handleWebhook: (
      webhookType: WebhookType,
      request: Request,
      secret: string,
    ) => Effect.Effect<void, InvalidHmacError | WebhookProcessingError>;
  }
>() {}
