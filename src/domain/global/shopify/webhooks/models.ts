import { Schema as S } from "effect";

// Shopify webhook headers
export const ShopifyWebhookHeaders = S.Struct({
  "x-shopify-topic": S.String,
  "x-shopify-hmac-sha256": S.String,
  "x-shopify-shop-domain": S.String,
  "x-shopify-webhook-id": S.String,
});

// App uninstalled webhook payload
export const AppUninstalledWebhookSchema = S.Struct({
  id: S.Number,
  name: S.String,
  email: S.String,
  domain: S.String,
  province: S.String,
  country: S.String,
  address1: S.String,
  zip: S.String,
  city: S.String,
  source: S.optional(S.String),
  phone: S.String,
  latitude: S.optional(S.Number),
  longitude: S.optional(S.Number),
  primary_location_id: S.Number,
  primary_locale: S.String,
  address2: S.optional(S.String),
  created_at: S.String,
  updated_at: S.String,
  country_code: S.String,
  country_name: S.String,
  currency: S.String,
  customer_email: S.String,
  timezone: S.String,
  iana_timezone: S.String,
  shop_owner: S.String,
  money_format: S.String,
  money_with_currency_format: S.String,
  weight_unit: S.String,
  province_code: S.String,
  taxes_included: S.Boolean,
  auto_configure_tax_inclusivity: S.optional(S.Boolean),
  tax_shipping: S.optional(S.Boolean),
  county_taxes: S.Boolean,
  plan_display_name: S.String,
  plan_name: S.String,
  has_discounts: S.Boolean,
  has_gift_cards: S.Boolean,
  myshopify_domain: S.String,
  google_apps_domain: S.optional(S.String),
  google_apps_login_enabled: S.optional(S.Boolean),
  money_in_emails_format: S.String,
  money_with_currency_in_emails_format: S.String,
  eligible_for_payments: S.Boolean,
  requires_extra_payments_agreement: S.Boolean,
  password_enabled: S.Boolean,
  has_storefront: S.Boolean,
  finances: S.Boolean,
  setup_required: S.Boolean,
  force_ssl: S.Boolean,
});

export type ShopifyWebhookHeaders = S.Schema.Type<typeof ShopifyWebhookHeaders>;
export type AppUninstalledWebhook = S.Schema.Type<
  typeof AppUninstalledWebhookSchema
>;

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  shopDomain?: string;
}

// Errors
export class WebhookVerificationError extends S.TaggedError<WebhookVerificationError>()(
  "WebhookVerificationError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

export class WebhookProcessingError extends S.TaggedError<WebhookProcessingError>()(
  "WebhookProcessingError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}
