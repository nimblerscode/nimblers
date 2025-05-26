import { Context, Effect, Layer } from "effect";
import { EmailService } from "@/domain/global/email/service";
import { auth } from "@/infrastructure/auth/better-auth/instance";
import { DrizzleD1Client } from "@/infrastructure/persistence/global/d1/drizzle";

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
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleD1Client;
    const emailService = yield* EmailService;

    // Initialize betterAuth with the Drizzle adapter, EmailService, and config
    const authInstance = auth(drizzleClient, emailService);
    return authInstance;
  }),
);
