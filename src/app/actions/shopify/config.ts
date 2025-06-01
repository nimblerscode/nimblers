"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { ShopifyConfigService } from "@/domain/shopify/config/service";
import { ShopifyConfigLayerLive } from "@/config/shopify";
import type { ShopifyConfig } from "@/domain/shopify/config/models";

export type { ShopifyConfig };

export async function getShopifyConfig(): Promise<ShopifyConfig> {
  const program = pipe(
    Effect.gen(function* () {
      const configService = yield* ShopifyConfigService;
      return yield* configService.getShopifyConfig({
        SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
      });
    }),
    Effect.provide(ShopifyConfigLayerLive)
  );

  return Effect.runPromise(program);
}
