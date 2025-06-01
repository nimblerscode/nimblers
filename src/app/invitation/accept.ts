"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { requestInfo } from "rwsdk/worker";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import { UserIdSchema } from "@/domain/global/user/model";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

type ActionState = {
  loading?: boolean;
  success?: boolean;
  error?: string;
};

export async function handleAcceptInvitation(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formData.get("token") as string;

  if (!token) {
    return { error: "Invitation token is required" };
  }

  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session?.userId) {
    return { error: "User must be authenticated to accept invitation" };
  }

  const userId = UserIdSchema.make(ctx.session.userId);

  const invitationProgram = InvitationDOService.pipe(
    Effect.flatMap((service) => service.accept(token, userId)),
  );

  const fullLayer = InvitationDOLive({
    ORG_DO: env.ORG_DO,
  });

  try {
    await Effect.runPromise(invitationProgram.pipe(Effect.provide(fullLayer)));

    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}
