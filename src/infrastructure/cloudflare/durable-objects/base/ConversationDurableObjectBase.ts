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
    console.log("=== CONVERSATION DO BASE CONSTRUCTOR START ===", {
      timestamp: new Date().toISOString(),
      doId: ctx.id.toString(),
    });

    this.state = ctx;
    this.env = env;
    this.doId = this.state.id.toString();

    this.state.blockConcurrencyWhile(async () => {
      try {
        console.log("ConversationDO: Starting migration process", {
          doId: this.doId,
          timestamp: new Date().toISOString(),
        });

        const coreMigrationEffect = Effect.flatMap(
          ConversationDrizzleDOClient,
          (client) => {
            console.log("ConversationDO: Got drizzle client, calling migrate", {
              doId: this.doId,
            });
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
            console.error("ConversationDO: Migration error details:", {
              doId: this.doId,
              error: e,
              errorType: typeof e,
              errorMessage: e instanceof Error ? e.message : String(e),
              errorStack: e instanceof Error ? e.stack : undefined,
            });
            return Effect.die(e);
          })
        );

        await Effect.runPromise(effectToRun);

        console.log("ConversationDO: Migration completed successfully", {
          doId: this.doId,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("ConversationDO: Failed to initialize - outer catch:", {
          doId: this.doId,
          error: e,
          errorType: typeof e,
          errorMessage: e instanceof Error ? e.message : String(e),
          errorStack: e instanceof Error ? e.stack : undefined,
          timestamp: new Date().toISOString(),
        });

        // Don't throw - let the DO start even if migration fails
        console.log("ConversationDO: Continuing despite migration failure");
      }
    });

    console.log("=== CONVERSATION DO BASE CONSTRUCTOR COMPLETE ===", {
      timestamp: new Date().toISOString(),
      doId: this.doId,
    });
  }

  // Subclasses must implement this
  abstract fetch(request: Request): Promise<Response>;
}
