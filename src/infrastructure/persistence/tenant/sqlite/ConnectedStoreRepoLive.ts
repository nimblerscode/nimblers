import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";
import {
  type ConnectedStore,
  type NewConnectedStore,
  type OrganizationId,
  OrgDbError,
} from "@/domain/tenant/organization/model";
import { ConnectedStoreRepo } from "@/domain/tenant/organization/service";
import { DrizzleDOClient } from "./drizzle";
import { eq } from "drizzle-orm";
import { connectedStore } from "./schema";

// Map database result to domain model
function mapDbStoreToDomain(dbStore: any): ConnectedStore {
  return {
    id: dbStore.id,
    organizationId: dbStore.organizationId,
    type: dbStore.type,
    shopDomain: dbStore.shopDomain,
    scope: dbStore.scope,
    status: dbStore.status as ConnectedStore["status"],
    connectedAt: dbStore.connectedAt,
    lastSyncAt: dbStore.lastSyncAt,
    metadata: dbStore.metadata,
    createdAt: dbStore.createdAt,
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

          return {
            ...mapDbStoreToDomain(result[0]),
            organizationId: store.organizationId,
          };
        }),

      upsert: (store: NewConnectedStore) =>
        Effect.gen(function* () {
          // First check if a store with this shop already exists (no organizationId needed in query)
          const existing = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(eq(connectedStore.shopDomain, store.shopDomain))
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

            return {
              ...mapDbStoreToDomain(result[0]),
              organizationId: store.organizationId,
            };
          }

          // Create new record
          const id = nanoid();
          const now = new Date();

          const insertData = {
            id,
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

          return {
            ...mapDbStoreToDomain(result[0]),
            organizationId: store.organizationId,
          };
        }),

      getByOrganizationId: (organizationId: OrganizationId) =>
        Effect.gen(function* () {
          // Since each organization has its own DO, we can get all stores
          const results = yield* Effect.tryPromise({
            try: () => drizzleClient.db.select().from(connectedStore),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          return results.map((store) => ({
            ...mapDbStoreToDomain(store),
            organizationId,
          }));
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

          return results.length > 0
            ? ({
                ...mapDbStoreToDomain(results[0]),
              } as ConnectedStore)
            : null;
        }),

      getByOrganizationAndShop: (
        organizationId: OrganizationId,
        shopDomain: string
      ) =>
        Effect.gen(function* () {
          // Since each organization has its own DO, we only need to query by shopDomain
          const results = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(connectedStore)
                .where(eq(connectedStore.shopDomain, shopDomain))
                .limit(1),
            catch: (error) => new OrgDbError({ cause: error }),
          });

          return results.length > 0
            ? {
                ...mapDbStoreToDomain(results[0]),
                organizationId,
              }
            : null;
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
