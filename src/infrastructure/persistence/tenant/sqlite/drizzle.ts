// Import the correct tenant schema
import * as tenantSchema from "@/infrastructure/persistence/tenant/sqlite/schema";
// Use the correct drizzle imports for Durable Objects SQLite
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Context, Effect, Layer } from "effect";
// @ts-ignore
import migrations from "../../../../../drizzle/tenant/migrations.js"; // Placeholder - PLEASE ADJUST

// === Context Tags ===

/**
 * Tag for the Durable Object's state, providing access to its storage.
 */
export const DurableObjectStorage = Context.GenericTag<DurableObjectState>(
  "infra/do/DurableObjectStorage",
);

/**
 * Tag for the Drizzle instance connected to the DO's internal SQLite DB.
 * Use the correct type from drizzle-orm/durable-sqlite.
 */
export const DrizzleSqliteDODatabaseTag = Context.GenericTag<
  DrizzleSqliteDODatabase<typeof tenantSchema>
>("infra/db/DrizzleSqliteDODatabase");

export class DrizzleDOClient extends Context.Tag("infra/db/DrizzleDOClient")<
  DrizzleDOClient,
  {
    readonly migrate: () => Effect.Effect<void, Error>;
    readonly db: DrizzleSqliteDODatabase<typeof tenantSchema>;
  }
>() {}

// === Live Layers ===

/**
 * Provides the Drizzle client connected to the Durable Object's internal SQLite DB.
 *
 * This layer depends on DurableObjectStorage.
 * It initializes the Drizzle client using the durable-sqlite driver
 * and runs database migrations on scope creation.
 */
export const DrizzleDOClientLive = Layer.scoped(
  DrizzleDOClient,
  Effect.gen(function* (_) {
    const doState = yield* _(DurableObjectStorage);
    const db = drizzle(doState.storage, {
      schema: tenantSchema,
      logger: true,
    });

    return {
      db,
      migrate: () =>
        Effect.gen(function* () {
          yield* _(
            Effect.tryPromise({
              try: () =>
                doState.blockConcurrencyWhile(async () => {
                  console.log("Migrating Drizzle DB");
                  try {
                    await migrate(db, migrations);
                    console.log("Drizzle DB migrated");
                  } catch (error) {
                    console.error("Drizzle migration failed:", error);
                    throw new Error("Drizzle migration failed");
                  }
                }),
              catch: (error) => {
                console.error("Drizzle migration failed:", error);
                return new Error("Drizzle migration failed");
              },
            }),
          );
        }),
    };
  }),
);

const schema = tenantSchema;

export { schema };
