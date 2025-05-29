import {
  drizzle,
  type DrizzleSqliteDODatabase,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Context, Effect, Layer } from "effect";
import { DurableObjectState } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import * as schema from "./schema";
// @ts-ignore
import migrations from "../../../../../../drizzle/shopify/migrations.js";

export { schema };

// Drizzle client for Shopify OAuth Durable Object
export class DrizzleShopifyOAuthClient extends Context.Tag(
  "@infrastructure/persistence/shopify/DrizzleClient"
)<
  DrizzleShopifyOAuthClient,
  {
    readonly migrate: () => Effect.Effect<void, Error>;
    readonly db: DrizzleSqliteDODatabase<typeof schema>;
  }
>() {}

export const DrizzleShopifyOAuthClientLive = Layer.scoped(
  DrizzleShopifyOAuthClient,
  Effect.gen(function* () {
    const doState = yield* DurableObjectState;
    const db = drizzle(doState.storage, {
      schema,
      logger: true,
    });

    return {
      db,
      migrate: () =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              doState.blockConcurrencyWhile(async () => {
                try {
                  await migrate(db, migrations);
                } catch (_error) {
                  throw new Error("Shopify OAuth migration failed");
                }
              }),
            catch: (_error) => {
              return new Error("Shopify OAuth migration failed");
            },
          });
        }),
    };
  })
);
