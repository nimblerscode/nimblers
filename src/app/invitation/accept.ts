"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";

type ActionState = {
  loading?: boolean;
  success?: boolean;
  error?: string;
};

export async function handleAcceptInvitation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = formData.get("token") as string;

  if (!token) {
    return { error: "Invitation token is required" };
  }

  const invitationProgram = InvitationDOService.pipe(
    Effect.flatMap((service) => service.accept(token))
  );

  const fullLayer = InvitationDOLive({
    ORG_DO: env.ORG_DO,
  });

  try {
    await Effect.runPromise(invitationProgram.pipe(Effect.provide(fullLayer)));

    return { success: true };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}
