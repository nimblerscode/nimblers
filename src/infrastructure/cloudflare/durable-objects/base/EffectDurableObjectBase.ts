// src/infrastructure/cloudflare/durable-objects/base/EffectDurableObjectBase.ts
import { Effect, Layer } from "effect";
import {
  DrizzleDOClient,
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";

export abstract class EffectDurableObjectBase {
  protected readonly state: DurableObjectState;
  protected readonly env: Env;
  protected readonly doId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    this.state = ctx;
    this.env = env;
    this.doId = this.state.id.toString();

    this.state.blockConcurrencyWhile(async () => {
      try {
        const coreMigrationEffect = Effect.flatMap(DrizzleDOClient, (client) =>
          client.migrate(),
        );
        const durableObjectStorageLayer = Layer.succeed(
          DurableObjectState,
          this.state,
        );
        const migrationSpecificProviderLayer = Layer.provide(
          DrizzleDOClientLive,
          durableObjectStorageLayer,
        );
        const layeredMigrationEffect = Effect.provide(
          coreMigrationEffect,
          migrationSpecificProviderLayer,
        );
        const fullyScopedEffect = Effect.scoped(layeredMigrationEffect);
        const effectToRun = fullyScopedEffect.pipe(
          Effect.catchAll((e) => {
            return Effect.die(e);
          }),
        );
        await Effect.runPromise(effectToRun);
      } catch (e) {
        throw new Error(
          `Failed to initialize DO during blockConcurrencyWhile: ${e}`,
        );
      }
    });
  }

  // Subclasses must implement this
  abstract fetch(request: Request): Promise<Response>;
}
