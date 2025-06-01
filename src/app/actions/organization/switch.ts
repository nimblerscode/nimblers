"use server";

import { env } from "cloudflare:workers";
import { Data, Effect, Layer, Option } from "effect";
import { requestInfo } from "rwsdk/worker";
import { SessionUseCaseLive } from "@/application/global/session/service";
import { DatabaseLive } from "@/config/layers";
import { SessionUseCase } from "@/domain/global/session/service";
import { UserIdSchema } from "@/domain/global/user/model";
import type { OrganizationId } from "@/domain/shopify/store/models";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { SessionRepoLive } from "@/infrastructure/persistence/global/d1/SessionRepoLive";

// Define custom errors
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError",
)<{
  message: string;
}> {}

export interface SwitchOrganizationResult {
  success: boolean;
  message: string;
  error?: string;
}

// Helper function to validate session and extract userId
const validateSessionAndGetUserId = Effect.gen(function* () {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session?.userId) {
    yield* Effect.fail(
      new AuthenticationError({ message: "User not authenticated" }),
    );
  }

  // TypeScript knows ctx.session.userId is defined here due to the guard above
  return UserIdSchema.make(ctx.session?.userId as string);
});

export async function getActiveOrganization(): Promise<string | null> {
  const program = Effect.gen(function* () {
    const userId = yield* validateSessionAndGetUserId;
    const sessionService = yield* SessionUseCase;
    const activeOrgOption = yield* sessionService.getActiveOrganization(userId);
    return Option.getOrNull(activeOrgOption);
  });

  const sessionRepoLayer = Layer.provide(
    SessionRepoLive,
    DatabaseLive({ DB: env.DB }),
  );
  const finalLayer = Layer.provide(SessionUseCaseLive, sessionRepoLayer);

  return Effect.runPromise(
    program.pipe(
      Effect.provide(finalLayer),
      Effect.catchAll((_error) => Effect.succeed(null)),
    ),
  );
}

export async function switchActiveOrganization(
  organizationId: OrganizationId,
): Promise<SwitchOrganizationResult> {
  const program = Effect.gen(function* () {
    const userId = yield* validateSessionAndGetUserId;
    const sessionService = yield* SessionUseCase;
    yield* sessionService.switchActiveOrganization(userId, organizationId);

    return {
      success: true,
      message: "Active organization updated successfully",
    };
  });

  const sessionRepoLayer = Layer.provide(
    SessionRepoLive,
    DatabaseLive({ DB: env.DB }),
  );
  const finalLayer = Layer.provide(SessionUseCaseLive, sessionRepoLayer);

  return Effect.runPromise(
    program.pipe(
      Effect.provide(finalLayer),
      Effect.catchAll((error) =>
        Effect.succeed({
          success: false,
          message: "Failed to update active organization",
          error: error instanceof Error ? error.message : String(error),
        }),
      ),
    ),
  );
}
