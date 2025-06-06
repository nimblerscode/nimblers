import { Effect, Layer } from "effect";
import {
  ConversationDrizzleDOClient,
  ConversationDrizzleDOClientLive,
  ConversationDurableObjectState,
} from "@/infrastructure/persistence/conversation/sqlite/drizzle";

export abstract class ConversationDurableObjectBase {
  protected readonly state: DurableObjectState;
  protected readonly env: Env;
  protected readonly doId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    this.state = ctx;
    this.env = env;
    this.doId = this.state.id.toString();

    this.state.blockConcurrencyWhile(async () => {
      try {
        console.log("ConversationDO: Starting migration process");
        const coreMigrationEffect = Effect.flatMap(
          ConversationDrizzleDOClient,
          (client) => {
            console.log("ConversationDO: Got drizzle client, calling migrate");
            return client.migrate();
          }
        );
        const durableObjectStorageLayer = Layer.succeed(
          ConversationDurableObjectState,
          this.state
        );
        const migrationSpecificProviderLayer = Layer.provide(
          ConversationDrizzleDOClientLive,
          durableObjectStorageLayer
        );
        const layeredMigrationEffect = Effect.provide(
          coreMigrationEffect,
          migrationSpecificProviderLayer
        );
        const fullyScopedEffect = Effect.scoped(layeredMigrationEffect);
        const effectToRun = fullyScopedEffect.pipe(
          Effect.catchAll((e) => {
            console.log("ConversationDO: Migration error:", e);
            return Effect.die(e);
          })
        );
        await Effect.runPromise(effectToRun);
        console.log("ConversationDO: Migration completed successfully");
      } catch (e) {
        console.log("ConversationDO: Failed to initialize:", e);
        throw new Error(
          `Failed to initialize Conversation DO during blockConcurrencyWhile: ${e}`
        );
      }
    });
  }

  // Subclasses must implement this
  abstract fetch(request: Request): Promise<Response>;
}
