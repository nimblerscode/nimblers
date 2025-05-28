import { Schema as S } from "effect";

// === Branded Types ===
export type ShopId = string & { readonly _tag: "ShopId" };
export type ShopDomain = string & { readonly _tag: "ShopDomain" };
export type CustomerId = string & { readonly _tag: "CustomerId" };
export type OrderId = string & { readonly _tag: "OrderId" };

// === Schemas ===
export const ShopIdSchema = S.String.pipe(S.brand("ShopId"));
export const ShopDomainSchema = S.String.pipe(S.brand("ShopDomain"));
export const CustomerIdSchema = S.String.pipe(S.brand("CustomerId"));
export const OrderIdSchema = S.String.pipe(S.brand("OrderId"));

// === Base Webhook Payload ===
export const BaseWebhookPayloadSchema = S.Struct({
  shop_id: S.Number,
  shop_domain: ShopDomainSchema,
});

export interface BaseWebhookPayload
  extends S.Schema.Type<typeof BaseWebhookPayloadSchema> {}

// === Customer Data Request Payload ===
export const CustomerDataRequestPayloadSchema = BaseWebhookPayloadSchema.pipe(
  S.extend(
    S.Struct({
      orders_requested: S.Array(S.Number),
      customer: S.Struct({
        id: S.Number,
        email: S.String,
        phone: S.optional(S.String),
      }),
    })
  )
);

export interface CustomerDataRequestPayload
  extends S.Schema.Type<typeof CustomerDataRequestPayloadSchema> {}

// === Customer Redact Payload ===
export const CustomerRedactPayloadSchema = BaseWebhookPayloadSchema.pipe(
  S.extend(
    S.Struct({
      customer: S.Struct({
        id: S.Number,
        email: S.String,
        phone: S.optional(S.String),
      }),
      orders_to_redact: S.Array(S.Number),
    })
  )
);

export interface CustomerRedactPayload
  extends S.Schema.Type<typeof CustomerRedactPayloadSchema> {}

// === Shop Redact Payload ===
export const ShopRedactPayloadSchema = BaseWebhookPayloadSchema;

export interface ShopRedactPayload
  extends S.Schema.Type<typeof ShopRedactPayloadSchema> {}

// === Errors ===
export class ShopifyWebhookError extends S.TaggedError<ShopifyWebhookError>()(
  "ShopifyWebhookError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  }
) {}

export class InvalidHmacError extends S.TaggedError<InvalidHmacError>()(
  "InvalidHmacError",
  {
    message: S.String,
  }
) {}

export class WebhookProcessingError extends S.TaggedError<WebhookProcessingError>()(
  "WebhookProcessingError",
  {
    message: S.String,
    webhookType: S.String,
    cause: S.optional(S.Unknown),
  }
) {}

// === Webhook Types ===
export const WebhookType = S.Literal(
  "customers-data-request",
  "customers-data-erasure",
  "shop-data-erasure"
);

export type WebhookType = S.Schema.Type<typeof WebhookType>;
