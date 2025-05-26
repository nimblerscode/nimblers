"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";
import { SessionUseCaseLive } from "@/application/global/session/service";
import { DatabaseLive } from "@/config/layers";
import { SessionUseCase } from "@/domain/global/session/service";
import { UserIdSchema } from "@/domain/global/user/model";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { SessionRepoLive } from "@/infrastructure/persistence/global/d1/SessionRepoLive";

export interface SwitchOrganizationResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function getActiveOrganization(): Promise<string | null> {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    return null;
  }

  const program = SessionUseCase.pipe(
    Effect.flatMap((sessionService) => {
      const userId = UserIdSchema.make(ctx.session?.userId);
      return sessionService.getActiveOrganization(userId);
    }),
  );

  const sessionRepoLayer = Layer.provide(
    SessionRepoLive,
    DatabaseLive({ DB: env.DB }),
  );
  const finalLayer = Layer.provide(SessionUseCaseLive, sessionRepoLayer);

  try {
    return await Effect.runPromise(
      program.pipe(
        Effect.provide(finalLayer),
        Effect.catchAll((_error) => {
          return Effect.succeed(null);
        }),
      ),
    );
  } catch (_error) {
    return null;
  }
}

export async function switchActiveOrganization(
  organizationId: string,
): Promise<SwitchOrganizationResult> {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    return {
      success: false,
      message: "User not authenticated",
      error: "No session found",
    };
  }

  const program = SessionUseCase.pipe(
    Effect.flatMap((sessionService) => {
      const userId = UserIdSchema.make(ctx.session?.userId);
      return sessionService.switchActiveOrganization(userId, organizationId);
    }),
    Effect.map(() => ({
      success: true,
      message: "Active organization updated successfully",
    })),
  );

  const sessionRepoLayer = Layer.provide(
    SessionRepoLive,
    DatabaseLive({ DB: env.DB }),
  );
  const finalLayer = Layer.provide(SessionUseCaseLive, sessionRepoLayer);

  try {
    return await Effect.runPromise(
      program.pipe(
        Effect.provide(finalLayer),
        Effect.catchAll((error) => {
          return Effect.succeed({
            success: false,
            message: "Failed to update active organization",
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      ),
    );
  } catch (error) {
    return {
      success: false,
      message: "Failed to update active organization",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
