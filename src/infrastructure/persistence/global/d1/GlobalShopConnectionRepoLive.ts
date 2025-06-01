import { Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import {
  GlobalDbError,
  GlobalShopConnectionRepo,
} from "@/domain/global/organization/service";
import type {
  NewShopConnection,
  OrganizationSlug,
  ShopConnection,
  ShopDomain,
} from "@/domain/global/organization/models";
import { DrizzleD1Client } from "./drizzle";
import { shopConnection } from "./schema";

export const GlobalShopConnectionRepoLive = Layer.effect(
  GlobalShopConnectionRepo,
  Effect.gen(function* () {
    const db = yield* DrizzleD1Client;

    return {
      create: (connection: NewShopConnection) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .insert(shopConnection)
                .values({
                  shopDomain: connection.shopDomain,
                  organizationSlug: connection.organizationSlug,
                  type: connection.type,
                  status: connection.status,
                  connectedAt: connection.connectedAt,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning(),
            catch: (error) =>
              new GlobalDbError(
                `Failed to create shop connection: ${error}`,
                error
              ),
          });

          if (!result[0]) {
            return yield* Effect.fail(
              new GlobalDbError("Insert returned no results")
            );
          }

          return result[0] as unknown as ShopConnection;
        }),

      getByShopDomain: (shopDomain: ShopDomain) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(shopConnection)
                .where(eq(shopConnection.shopDomain, shopDomain))
                .limit(1),
            catch: (error) =>
              new GlobalDbError(
                `Failed to query shop connection: ${error}`,
                error
              ),
          });

          return result[0] ? (result[0] as unknown as ShopConnection) : null;
        }),

      deleteByShopDomain: (shopDomain: ShopDomain) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .delete(shopConnection)
                .where(eq(shopConnection.shopDomain, shopDomain)),
            catch: (error) =>
              new GlobalDbError(
                `Failed to delete shop connection: ${error}`,
                error
              ),
          });

          return result.meta.changes > 0;
        }),

      getByOrganizationSlug: (organizationSlug: OrganizationSlug) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(shopConnection)
                .where(eq(shopConnection.organizationSlug, organizationSlug)),
            catch: (error) =>
              new GlobalDbError(
                `Failed to query organization shops: ${error}`,
                error
              ),
          });

          return result as unknown as ShopConnection[];
        }),
    };
  })
);
