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
            console.error(
              `DO (${this.doId}): Migration failed inside blockConcurrencyWhile! Aborting constructor.`,
              e,
            );
            return Effect.die(e);
          }),
        );
        await Effect.runPromise(effectToRun);
        console.log(`DO (${this.doId}): Migrations run successfully.`);
        console.log(`DO (${this.doId}): Runtime built successfully.`);
      } catch (e) {
        console.error(
          `DO (${this.doId}): Error during blockConcurrencyWhile (migrations/runtime setup)! Aborting constructor.`,
          e,
        );
        throw new Error(
          `Failed to initialize DO during blockConcurrencyWhile: ${e}`,
        );
      }
    });

    console.log(`DO (${this.doId}): Constructed.`);
  }

  // Subclasses must implement this
  abstract fetch(request: Request): Promise<Response>;
}
