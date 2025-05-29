"use server";

import { Effect } from "effect";
import { env } from "cloudflare:workers";
import { ShopifyOAuthUseCase } from "@/domain/global/shopify/oauth/service";
import { ShopifyOAuthLayerLive } from "@/config/layers";

interface StoreConnection {
  connected: boolean;
  shop?: string;
  scope?: string;
  connectedAt?: Date;
  lastSync?: Date;
}

export async function getOrganizationStoreConnections(
  organizationSlug: string,
  shopDomain?: string
): Promise<StoreConnection[]> {
  // For now, we'll check the OAuth token storage
  // Later we'll implement the organization-specific store connections

  if (!shopDomain) {
    // If no specific shop provided, return empty for now
    // TODO: Get all connected stores for this organization
    return [];
  }

  const program = Effect.gen(function* () {
    const oauthUseCase = yield* ShopifyOAuthUseCase;
    const status = yield* oauthUseCase.checkConnectionStatus(shopDomain as any);

    if (status.connected) {
      return [
        {
          connected: true,
          shop: status.shop,
          scope: status.scope,
          connectedAt: new Date(), // TODO: Get actual connection date
        },
      ];
    }

    return [];
  });

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          ShopifyOAuthLayerLive({
            SHOPIFY_OAUTH_DO: env.SHOPIFY_OAUTH_DO as any,
            SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
            SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
          })
        ),
        Effect.catchAll(() => Effect.succeed([]))
      )
    );

    return result;
  } catch (error) {
    return [];
  }
}

// Simple helper to check if a specific shop is connected
export async function isShopConnected(
  organizationSlug: string,
  shopDomain: string
): Promise<{ connected: boolean; shop?: string }> {
  const connections = await getOrganizationStoreConnections(
    organizationSlug,
    shopDomain
  );
  const connection = connections.find((c) => c.shop === shopDomain);

  return {
    connected: connection?.connected || false,
    shop: connection?.shop,
  };
}
