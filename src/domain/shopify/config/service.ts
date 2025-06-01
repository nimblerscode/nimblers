import { Context, type Effect } from "effect";
import type { ShopifyConfig } from "./models";

// === Shopify Configuration Service ===
export abstract class ShopifyConfigService extends Context.Tag(
  "@core/shopify/ConfigService"
)<
  ShopifyConfigService,
  {
    readonly getShopifyConfig: (env: {
      SHOPIFY_CLIENT_ID: string;
    }) => Effect.Effect<ShopifyConfig, never>;
  }
>() {}
