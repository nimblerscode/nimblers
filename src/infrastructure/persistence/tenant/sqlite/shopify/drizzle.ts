import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Context, Data, Effect, Layer } from "effect";
import { DurableObjectState } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
// @ts-ignore
import migrations from "../../../../../../drizzle/shopify/migrations.js";
import * as schema from "./schema";

export { schema };

// Define specific migration errors
export class ShopifyMigrationError extends Data.TaggedError(
  "ShopifyMigrationError",
)<{
  readonly cause?: unknown;
  readonly message: string;
  readonly migrationDetails?: {
    readonly migrationsCount: number;
    readonly lastMigration?: string;
  };
}> {}

export class ShopifyMigrationConcurrencyError extends Data.TaggedError(
  "ShopifyMigrationConcurrencyError",
)<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

// Drizzle client for Shopify OAuth Durable Object
export class DrizzleShopifyOAuthClient extends Context.Tag(
  "@infrastructure/persistence/shopify/DrizzleClient",
)<
  DrizzleShopifyOAuthClient,
  {
    readonly migrate: () => Effect.Effect<
      void,
      ShopifyMigrationError | ShopifyMigrationConcurrencyError
    >;
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
          yield* Effect.logInfo("Starting Shopify OAuth database migration", {
            migrationsCount: migrations.length,
          });

          const migrationResult = yield* Effect.tryPromise({
            try: () =>
              doState.blockConcurrencyWhile(async () => {
                try {
                  const result = await migrate(db, migrations);
                  return result;
                } catch (migrationError) {
                  throw new ShopifyMigrationError({
                    message: `Database migration failed: ${
                      migrationError instanceof Error
                        ? migrationError.message
                        : String(migrationError)
                    }`,
                    cause: migrationError,
                    migrationDetails: {
                      migrationsCount: migrations.length,
                      lastMigration:
                        migrations[migrations.length - 1]?.name || "unknown",
                    },
                  });
                }
              }),
            catch: (concurrencyError) => {
              return new ShopifyMigrationConcurrencyError({
                message: `Migration concurrency control failed: ${
                  concurrencyError instanceof Error
                    ? concurrencyError.message
                    : String(concurrencyError)
                }`,
                cause: concurrencyError,
              });
            },
          });

          yield* Effect.logInfo(
            "Shopify OAuth migration completed successfully",
          );
          return migrationResult;
        }),
    };
  }),
);
