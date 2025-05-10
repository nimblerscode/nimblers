import { Context, Effect, Layer } from "effect";

import { EmailService } from "@/core/email/services";
import { DrizzleD1Client } from "@/infra/db/drizzle/drizzle";
import { auth } from "./instance";

export type InferredAuthInstance = ReturnType<typeof auth>;

export class BetterAuthInstance extends Context.Tag(
  "infra/auth/BetterAuthInstance",
)<BetterAuthInstance, InferredAuthInstance>() {}

// Create a Layer that provides the configured BetterAuth instance
// This layer now depends on DrizzleD1Client and EmailService
export const BetterAuthConfigLive: Layer.Layer<
  BetterAuthInstance,
  never,
  DrizzleD1Client | EmailService
> = Layer.effect(
  BetterAuthInstance,
  Effect.gen(function* (_) {
    const drizzleClient = yield* _(DrizzleD1Client);
    const emailService = yield* _(EmailService);

    // Initialize betterAuth with the Drizzle adapter, EmailService, and config
    const authInstance = auth(drizzleClient, emailService);

    console.log("Better Auth Initialized (Placeholder) with EmailService");
    return authInstance;
  }),
);
