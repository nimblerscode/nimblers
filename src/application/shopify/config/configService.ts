import { Effect } from "effect";
import { EnvironmentConfigServiceLive } from "@/infrastructure/environment/EnvironmentConfigService";

export interface ShopifyConfig {
  clientId: string;
}

export class ShopifyConfigApplicationService {
  static getShopifyConfig = (env: {
    SHOPIFY_CLIENT_ID: string;
  }): Effect.Effect<ShopifyConfig, never> =>
    Effect.succeed({
      clientId: env.SHOPIFY_CLIENT_ID,
      // Don't expose client secret to the client
    }).pipe(
      Effect.provide(EnvironmentConfigServiceLive),
      Effect.catchAll(() =>
        Effect.succeed({
          clientId: env.SHOPIFY_CLIENT_ID,
        })
      )
    );
}
