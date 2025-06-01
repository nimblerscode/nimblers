import { and, eq } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
import { nanoid } from "nanoid";
import {
  type ConnectedStore,
  type NewConnectedStore,
  type OrganizationId,
  OrgDbError,
} from "@/domain/tenant/organization/model";
import { ConnectedStoreRepo } from "@/domain/tenant/organization/service";
import { DrizzleDOClient } from "./drizzle";
import { connectedStore } from "./schema";

// Helper function to convert DB row to domain model
function mapDbStoreToDomain(dbStore: any): ConnectedStore {
  return {
    id: dbStore.id,
    organizationId: dbStore.organizationId as OrganizationId,
    type: dbStore.type as "shopify",
    shopDomain: dbStore.shopDomain,
    scope: dbStore.scope,
    status: dbStore.status as ConnectedStore["status"],
    connectedAt: new Date(dbStore.connectedAt),
    lastSyncAt: dbStore.lastSyncAt ? new Date(dbStore.lastSyncAt) : null,
    metadata: dbStore.metadata,
    createdAt: new Date(dbStore.createdAt),
  };
}

export const ConnectedStoreRepoLive = Layer.effect(
  ConnectedStoreRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (store: NewConnectedStore) =>
        Effect.gen(function* () {
          const id = nanoid();
          const now = new Date();

          const insertData = {
            id,
            organizationId: store.organizationId,
            type: store.type,
            shopDomain: store.shopDomain,
            scope: store.scope,
            status: store.status,
            connectedAt: store.connectedAt,
            lastSyncAt: store.lastSyncAt || undefined,
            metadata: store.metadata,
            createdAt: now,
          };

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(connectedStore)
                .values(insertData)
                .returning(),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          if (!result || result.length === 0) {
            return yield* Effect.fail(
              new OrgDbError({ cause: "Insert returned no results" })
            );
          }

          return mapDbStoreToDomain(result[0]);
        }),

      upsert: (store: NewConnectedStore) =>
        Effect.gen(function* () {
          // First check if a store with this org + shop already exists
          const existing = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(
                  and(
                    eq(connectedStore.organizationId, store.organizationId),
                    eq(connectedStore.shopDomain, store.shopDomain)
                  )
                )
                .limit(1),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          if (existing.length > 0) {
            // Update existing record
            const existingStore = existing[0];
            const updateData = {
              scope: store.scope,
              status: store.status,
              lastSyncAt: new Date(),
              metadata: store.metadata,
            };

            const result = yield* Effect.tryPromise({
              try: () =>
                drizzleClient.db
                  .update(connectedStore)
                  .set(updateData)
                  .where(eq(connectedStore.id, existingStore.id))
                  .returning(),
              catch: (error) => new OrgDbError({ cause: error }),
            });

            if (!result || result.length === 0) {
              return yield* Effect.fail(
                new OrgDbError({ cause: "Update returned no results" })
              );
            }

            return mapDbStoreToDomain(result[0]);
          }

          // Create new record
          const id = nanoid();
          const now = new Date();

          const insertData = {
            id,
            organizationId: store.organizationId,
            type: store.type,
            shopDomain: store.shopDomain,
            scope: store.scope,
            status: store.status,
            connectedAt: store.connectedAt,
            lastSyncAt: store.lastSyncAt || undefined,
            metadata: store.metadata,
            createdAt: now,
          };

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(connectedStore)
                .values(insertData)
                .returning(),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          if (!result || result.length === 0) {
            return yield* Effect.fail(
              new OrgDbError({ cause: "Insert returned no results" })
            );
          }

          return mapDbStoreToDomain(result[0]);
        }),

      getByOrganizationId: (organizationId: OrganizationId) =>
        Effect.gen(function* () {
          const results = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(eq(connectedStore.organizationId, organizationId)),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          return results.map(mapDbStoreToDomain);
        }),

      getByShopDomain: (shopDomain: string) =>
        Effect.gen(function* () {
          const results = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(eq(connectedStore.shopDomain, shopDomain))
                .limit(1),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          return results.length > 0 ? mapDbStoreToDomain(results[0]) : null;
        }),

      getByOrganizationAndShop: (
        organizationId: OrganizationId,
        shopDomain: string
      ) =>
        Effect.gen(function* () {
          const results = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(
                  and(
                    eq(connectedStore.organizationId, organizationId),
                    eq(connectedStore.shopDomain, shopDomain)
                  )
                )
                .limit(1),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          return results.length > 0 ? mapDbStoreToDomain(results[0]) : null;
        }),

      updateStatus: (storeId: string, status: ConnectedStore["status"]) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(connectedStore)
                .set({
                  status,
                  lastSyncAt: new Date(),
                })
                .where(eq(connectedStore.id, storeId)),
            catch: (error) => new OrgDbError({ cause: error }),
          });
        }),

      delete: (storeId: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(connectedStore)
                .where(eq(connectedStore.id, storeId)),
            catch: (error) => new OrgDbError({ cause: error }),
          });
        }),
    };
  })
);
