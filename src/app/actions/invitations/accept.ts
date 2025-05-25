"use server";

import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import { env } from "cloudflare:workers";
import { Effect } from "effect";
import type { RequestInfo } from "rwsdk/worker";

interface AcceptInvitationRequest {
  token: string;
}

export async function acceptInvitationAction(
  request: Request,
  { ctx }: RequestInfo
) {
  try {
    // Parse the request body
    const body = (await request.json()) as AcceptInvitationRequest;
    const { token } = body;

    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 });
    }

    // Get the current user from the context (they should be logged in after signup)
    const currentUser = (ctx as any)?.user;

    if (!currentUser) {
      return Response.json(
        { error: "User must be authenticated to accept invitations" },
        { status: 401 }
      );
    }

    // Use Effect to accept the invitation
    const program = Effect.gen(function* (_) {
      const invitationService = yield* _(InvitationDOService);

      // Get the invitation first to validate it
      const invitation = yield* _(invitationService.get(token));

      // For now, we'll just return the invitation data
      // TODO: Implement actual acceptance logic
      return invitation;
    });

    const fullLayer = InvitationDOLive({
      ORG_DO: env.ORG_DO,
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(fullLayer))
    );

    return Response.json({
      success: true,
      message: "Invitation accepted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);

    return Response.json(
      {
        error: "Failed to accept invitation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
