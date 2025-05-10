import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { Effect, Layer, Context } from "effect";
import * as schema from "../schemas/schema";

// Define the Tag for the D1 Binding itself
export interface D1Binding extends D1Database {}
export const D1Binding = Context.GenericTag<D1Binding>("infra/db/D1Binding");

// Define the Tag for the Drizzle client instance

export class DrizzleD1Client extends Context.Tag("infra/db/DrizzleD1Client")<
  DrizzleD1Client,
  DrizzleD1Database<typeof schema>
>() {}

export class DrizzleD1ClientTest extends Context.Tag(
  "infra/db/DrizzleD1ClientTest"
)<DrizzleD1ClientTest, {}>() {}

// Live Layer for the D1 Binding (Depends on Env)
export const D1BindingLive = (env: { DB: D1Database }) =>
  Layer.succeed(D1Binding, env.DB);

// Live Layer for the Drizzle Client (Depends on D1Binding)
export const DrizzleD1ClientLive = Layer.effect(
  DrizzleD1Client,
  Effect.gen(function* (_) {
    const d1 = yield* _(D1Binding); // Get the D1 binding from context
    // Create the Drizzle client instance
    const db = drizzle(d1, { schema, logger: true }); // Enable logging maybe?
    return db;
  })
);

// Re-export schema for convenience
export { schema };
