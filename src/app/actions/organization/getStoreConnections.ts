"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { OrganizationDOLive } from "@/config/layers";
import { OrganizationDOService } from "@/domain/tenant/organization/service";

interface StoreConnection {
  connected: boolean;
  shop?: string;
  scope?: string;
  connectedAt?: Date;
  lastSync?: Date;
}

export async function getOrganizationStoreConnections(
  organizationSlug: string,
  shopDomain?: string,
): Promise<StoreConnection[]> {
  const program = Effect.gen(function* () {
    const organizationDOService = yield* OrganizationDOService;

    // For now, just get the organization and return empty stores
    // TODO: Implement proper store connection querying via HTTP API endpoints in the DO
    const _organization =
      yield* organizationDOService.getOrganization(organizationSlug);

    // Temporary: return empty array until we implement the proper DO endpoints
    // This ensures no data leakage between organizations
    return [];
  });

  const organizationLayerLive = OrganizationDOLive({
    ORG_DO: env.ORG_DO,
  });

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(organizationLayerLive),
        Effect.catchAll((_error) => {
          // Silently return empty array on errors to prevent data leakage
          return Effect.succeed([]);
        }),
      ),
    );
    return result;
  } catch (_error) {
    // Fallback to empty array to prevent data leakage
    return [];
  }
}

// Simple helper to check if a specific shop is connected to a specific organization
export async function isShopConnected(
  organizationSlug: string,
  shopDomain: string,
): Promise<{ connected: boolean; shop?: string }> {
  const connections = await getOrganizationStoreConnections(
    organizationSlug,
    shopDomain,
  );
  const connection = connections.find((c) => c.shop === shopDomain);

  return {
    connected: connection?.connected || false,
    shop: connection?.shop,
  };
}
