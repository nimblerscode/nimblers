// Use the correct drizzle imports for Durable Objects SQLite
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Context, Data, Effect, Layer } from "effect";
import * as conversationSchema from "@/infrastructure/persistence/conversation/sqlite/schema";
// @ts-ignore
import conversationMigrations from "../../../../../drizzle/conversation/migrations.js";

// === Migration Errors ===

export class ConversationMigrationError extends Data.TaggedError(
  "ConversationMigrationError"
)<{
  readonly cause?: unknown;
  readonly message: string;
  readonly migrationDetails?: {
    readonly migrationsCount: number;
    readonly lastMigration?: string;
  };
}> {}

export class ConversationMigrationConcurrencyError extends Data.TaggedError(
  "ConversationMigrationConcurrencyError"
)<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

// === Context Tags ===

/**
 * Tag for the Durable Object's state, providing access to its storage.
 */
export const ConversationDurableObjectState =
  Context.GenericTag<DurableObjectState>(
    "infra/conversation-do/DurableObjectStorage"
  );

/**
 * Tag for the Drizzle instance connected to the Conversation DO's internal SQLite DB.
 * Use the correct type from drizzle-orm/durable-sqlite.
 */
export const DrizzleSqliteConversationDODatabaseTag = Context.GenericTag<
  DrizzleSqliteDODatabase<typeof conversationSchema>
>("infra/conversation-db/DrizzleSqliteDODatabase");

export class ConversationDrizzleDOClient extends Context.Tag(
  "infra/conversation-db/DrizzleDOClient"
)<
  ConversationDrizzleDOClient,
  {
    readonly migrate: () => Effect.Effect<
      void,
      ConversationMigrationError | ConversationMigrationConcurrencyError
    >;
    readonly db: DrizzleSqliteDODatabase<typeof conversationSchema>;
  }
>() {}

// === Live Layers ===

/**
 * Provides the Drizzle client connected to the Conversation Durable Object's internal SQLite DB.
 *
 * This layer depends on ConversationDurableObjectState.
 * It initializes the Drizzle client using the durable-sqlite driver
 * and runs conversation database migrations on scope creation.
 */
export const ConversationDrizzleDOClientLive = Layer.scoped(
  ConversationDrizzleDOClient,
  Effect.gen(function* () {
    const doState = yield* ConversationDurableObjectState;
    const db = drizzle(doState.storage, {
      schema: conversationSchema,
      logger: true,
    });

    return {
      db,
      migrate: () =>
        Effect.gen(function* () {
          // biome-ignore lint: Debug logging for migration issues
          console.log("ConversationDrizzle: Starting migration");
          // biome-ignore lint: Debug logging for migration issues
          console.log("ConversationDrizzle: Import source:", {
            importPath: "../../../../../drizzle/conversation/migrations.js",
            migrationsObjectType: typeof conversationMigrations,
            migrationsString: JSON.stringify(conversationMigrations).substring(
              0,
              500
            ),
          });
          // biome-ignore lint: Debug logging for migration issues
          console.log("ConversationDrizzle: Migration object:", {
            hasJournal: !!conversationMigrations.journal,
            hasMigrations: !!conversationMigrations.migrations,
            journalEntries:
              conversationMigrations.journal?.entries?.length || 0,
            migrationKeys: Object.keys(conversationMigrations.migrations || {}),
          });

          if (conversationMigrations.migrations) {
            const migrationKeys = Object.keys(
              conversationMigrations.migrations
            );
            for (const key of migrationKeys) {
              // biome-ignore lint: Debug logging for migration issues
              console.log(
                `ConversationDrizzle: Migration ${key} content preview:`,
                conversationMigrations.migrations[key].substring(0, 200) + "..."
              );
            }
          }

          yield* Effect.tryPromise({
            try: () =>
              doState.blockConcurrencyWhile(async () => {
                try {
                  // biome-ignore lint: Debug logging for migration issues
                  console.log(
                    "ConversationDrizzle: Running migrate with migrations:",
                    Object.keys(conversationMigrations)
                  );
                  const result = await migrate(db, conversationMigrations);
                  // biome-ignore lint: Debug logging for migration issues
                  console.log("ConversationDrizzle: Migration completed");
                  return result;
                } catch (migrationError) {
                  // biome-ignore lint: Debug logging for migration issues
                  console.log(
                    "ConversationDrizzle: Migration error:",
                    migrationError
                  );
                  throw new ConversationMigrationError({
                    message: `Database migration failed: ${
                      migrationError instanceof Error
                        ? migrationError.message
                        : String(migrationError)
                    }`,
                    cause: migrationError,
                    migrationDetails: {
                      migrationsCount: Object.keys(
                        conversationMigrations.migrations || {}
                      ).length,
                      lastMigration: "conversation-latest",
                    },
                  });
                }
              }),
            catch: (concurrencyError) => {
              // biome-ignore lint: Debug logging for migration issues
              console.log(
                "ConversationDrizzle: Migration wrapper error:",
                concurrencyError
              );
              return new ConversationMigrationConcurrencyError({
                message: `Migration concurrency control failed: ${
                  concurrencyError instanceof Error
                    ? concurrencyError.message
                    : String(concurrencyError)
                }`,
                cause: concurrencyError,
              });
            },
          });
        }),
    };
  })
);

const schema = conversationSchema;

export { schema };
