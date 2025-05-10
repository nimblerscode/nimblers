import { Effect, Layer } from "effect";

import {
  DrizzleDOClient,
  DrizzleDOClientLive,
  DurableObjectStorage,
} from "@/infra/db/drizzle/drizzleDO";
import { getOrgHandler } from "../organization/handlers";

// --- Durable Object Class ---

export class OrganizationDurableObject implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  // Use the imported context type
  private readonly orgId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    this.state = ctx;
    this.env = env;
    this.orgId = this.state.id.toString();

    this.state.blockConcurrencyWhile(async () => {
      try {
        // 1. Define the core migration task
        const coreMigrationEffect = Effect.flatMap(DrizzleDOClient, (client) =>
          client.migrate(),
        );

        // 2. Create layers needed for the coreMigrationEffect
        const durableObjectStorageLayer = Layer.succeed(
          DurableObjectStorage,
          this.state,
        );
        // DrizzleDOClientLive requires DurableObjectStorage. Provide it.
        const migrationSpecificProviderLayer = Layer.provide(
          DrizzleDOClientLive,
          durableObjectStorageLayer,
        );

        // 3. Provide the specific layer to the core migration effect.
        // This will leave Scope as a requirement because DrizzleDOClientLive is scoped.
        const layeredMigrationEffect = Effect.provide(
          coreMigrationEffect,
          migrationSpecificProviderLayer,
        );

        // 4. Manage the scope for the layered effect.
        // Effect.scoped handles the acquisition and release of scoped resources.
        // This results in an Effect<void, Error, never>.
        const fullyScopedEffect = Effect.scoped(layeredMigrationEffect);

        // 5. Add error handling to the fully self-contained effect.
        const effectToRun = fullyScopedEffect.pipe(
          Effect.catchAll((e) => {
            console.error(
              `DO (${this.orgId}): Migration failed inside blockConcurrencyWhile! Aborting constructor.`,
              e,
            );
            return Effect.die(e); // Propagate as a defect for runPromise to reject
          }),
        );

        // 6. Run the self-contained effect using global Effect.runPromise.
        await Effect.runPromise(effectToRun);

        console.log(`DO (${this.orgId}): Migrations run successfully.`);
        console.log(`DO (${this.orgId}): Runtime built successfully.`);
      } catch (e) {
        // This will catch defects from Effect.die or other unhandled errors from runPromise.
        console.error(
          `DO (${this.orgId}): Error during blockConcurrencyWhile (migrations/runtime setup)! Aborting constructor.`,
          e,
        );
        throw new Error(
          `Failed to initialize OrganizationDO during blockConcurrencyWhile: ${e}`,
        );
      }
    });

    console.log(`DO (${this.orgId}): Constructed.`);
  }

  async fetch(request: Request): Promise<Response> {
    const { handler } = getOrgHandler(this.state);

    const response = await handler(request);

    return response;
  }
}
