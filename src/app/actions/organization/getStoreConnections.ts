"use server";

import { env } from "cloudflare:workers";
import { Data, Effect, Layer } from "effect";
import { StoreConnectionLayerLive } from "@/config/shopify";
import { Tracing } from "@/tracing";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import {
  StoreConnectionError,
  StoreDbError,
  StoreNotFoundError,
} from "@/domain/shopify/store/models";
import { ShopifyStoreService } from "@/domain/shopify/store/service";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";

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

// Error types for better error handling
class OrganizationNotFoundError extends Data.TaggedError(
  "OrganizationNotFoundError"
)<{
  message: string;
  retryable: boolean;
}> {}

class DatabaseUnavailableError extends Data.TaggedError(
  "DatabaseUnavailableError"
)<{
  message: string;
  retryable: boolean;
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  message: string;
  retryable: boolean;
}> {}

class UnknownStoreError extends Data.TaggedError("UnknownStoreError")<{
  message: string;
  retryable: boolean;
}> {}

type StoreActionError =
  | OrganizationNotFoundError
  | DatabaseUnavailableError
  | NetworkError
  | UnknownStoreError;

type ConnectedStoreResult =
  | { success: true; data: ConnectedStore[] }
  | { success: false; error: StoreActionError };

export async function getOrganizationConnectedStores(
  organizationSlug: OrganizationSlug
): Promise<ConnectedStoreResult> {
  const program = Effect.gen(function* () {
    const storeService = yield* ShopifyStoreService;

    const stores = yield* storeService
      .getConnectedStores(organizationSlug)
      .pipe(
        Effect.withSpan("get-connected-stores", {
          attributes: {
            "organization.slug": organizationSlug,
            "action.type": "get-connected-stores",
          },
        })
      );

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
  }).pipe(
    Effect.withSpan("get-organization-connected-stores-action", {
      attributes: {
        "action.type": "get-organization-connected-stores",
        "organization.slug": organizationSlug,
      },
    }),
    Effect.mapError((error): StoreActionError => {
      if (error instanceof StoreNotFoundError) {
        return new OrganizationNotFoundError({
          message: "Organization not found",
          retryable: false,
        });
      }
      if (error instanceof StoreDbError) {
        return new DatabaseUnavailableError({
          message: "Database temporarily unavailable",
          retryable: true,
        });
      }
      if (error instanceof StoreConnectionError) {
        return new NetworkError({
          message: "Network error occurred",
          retryable: true,
        });
      }
      // Handle generic Error objects from the service layer
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("not found")) {
        return new OrganizationNotFoundError({
          message: "Organization not found",
          retryable: false,
        });
      }
      if (
        errorMessage.toLowerCase().includes("database") ||
        errorMessage.toLowerCase().includes("d1")
      ) {
        return new DatabaseUnavailableError({
          message: "Database temporarily unavailable",
          retryable: true,
        });
      }
      return new UnknownStoreError({
        message: "An unexpected error occurred",
        retryable: true,
      });
    })
  );

  const d1Layer = D1BindingLive(env);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);

  const layer = StoreConnectionLayerLive({
    ORG_DO: env.ORG_DO,
    DB: env.DB,
  }).pipe(Layer.provide(drizzleLayer));

  return Effect.runPromise(
    program.pipe(
      Effect.provide(layer),
      Effect.provide(Tracing), // Add tracing layer
      Effect.match({
        onFailure: (error) => ({ success: false as const, error }),
        onSuccess: (data) => ({ success: true as const, data }),
      })
    )
  );
}
