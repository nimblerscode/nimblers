"use server";

import { env } from "cloudflare:workers";
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";

interface StoreConnection {
  connected: boolean;
  shop?: string;
  scope?: string;
  connectedAt?: Date;
  lastSync?: Date;
}

interface ConnectedStore {
  id: string;
  organizationId: string;
  type: string;
  shopDomain: string;
  scope: string | null;
  status: "active" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt: string | null;
  metadata: string | null;
  createdAt: string;
}

export async function getOrganizationStoreConnections(
  organizationSlug: string,
  shopDomain?: string,
): Promise<StoreConnection[]> {
  const program = Effect.gen(function* () {
    const doId = env.ORG_DO.idFromName(organizationSlug);
    const stub = env.ORG_DO.get(doId);

    // Create the DO client
    const client = yield* createOrganizationDOClient(stub);

    // Call the new getConnectedStores endpoint
    const stores = yield* client.organizations.getConnectedStores();

    // Convert to the interface format
    return stores.map((store) => ({
      connected: store.status === "active",
      shop: store.shopDomain,
      scope: store.scope || undefined,
      connectedAt: store.connectedAt,
      lastSync: store.lastSyncAt || undefined,
    }));
  });

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(FetchHttpClient.layer),
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

export async function getOrganizationConnectedStores(
  organizationSlug: string,
): Promise<ConnectedStore[]> {
  const program = Effect.gen(function* () {
    const doId = env.ORG_DO.idFromName(organizationSlug);
    const stub = env.ORG_DO.get(doId);

    // Create the DO client
    const client = yield* createOrganizationDOClient(stub);

    // Call the getConnectedStores endpoint
    const stores = yield* client.organizations.getConnectedStores();

    // Return the full store data with proper format
    return stores.map((store) => ({
      id: store.id,
      organizationId: store.organizationId,
      type: store.type,
      shopDomain: store.shopDomain,
      scope: store.scope,
      status: store.status,
      connectedAt: store.connectedAt.toISOString(),
      lastSyncAt: store.lastSyncAt?.toISOString() || null,
      metadata: store.metadata,
      createdAt: store.createdAt.toISOString(),
    }));
  });

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(FetchHttpClient.layer),
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
