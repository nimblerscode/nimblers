import { Effect, Layer } from "effect";
import type { ShopifyConfig } from "@/domain/shopify/config/models";
import { ShopifyConfigService } from "@/domain/shopify/config/service";

export const ShopifyConfigServiceLive = Layer.effect(
  ShopifyConfigService,
  Effect.gen(function* () {
    return {
      getShopifyConfig: (env: {
        SHOPIFY_CLIENT_ID: string;
      }): Effect.Effect<ShopifyConfig, never> =>
        Effect.gen(function* () {
          // Validate that the client ID is provided
          if (!env.SHOPIFY_CLIENT_ID) {
            yield* Effect.log("Missing SHOPIFY_CLIENT_ID environment variable");
            // Return empty config rather than failing for graceful degradation
            return { clientId: "" };
          }

          // Log successful config retrieval
          yield* Effect.log("Shopify configuration retrieved successfully");

          return {
            clientId: env.SHOPIFY_CLIENT_ID,
            // Don't expose client secret to the client
          };
        }).pipe(
          Effect.withSpan("ShopifyConfigService.getShopifyConfig"),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.log(
                `Shopify config retrieval error: ${String(error)}`,
              );
              // Graceful fallback
              return { clientId: env.SHOPIFY_CLIENT_ID || "" };
            }),
          ),
        ),
    };
  }),
);

// Re-export types for convenience
export type { ShopifyConfig } from "@/domain/shopify/config/models";
