"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import {
  ShopifyConfigApplicationService,
  type ShopifyConfig,
} from "@/application/shopify/config/configService";

export type { ShopifyConfig };

export async function getShopifyConfig(): Promise<ShopifyConfig> {
  return Effect.runPromise(
    ShopifyConfigApplicationService.getShopifyConfig({
      SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
    })
  );
}
