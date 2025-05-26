"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import type { Invitation } from "@/domain/tenant/invitations/models";

// Define error types
export class InvitationListError extends Error {
  readonly _tag = "InvitationListError";
  constructor(
    message: string,
    public code = "LIST_FAILED",
  ) {
    super(message);
  }
}

// Serializable invitation data for client components
export interface SerializableInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string;
}

const safeToISOString = (dateValue: unknown): string => {
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime())
      ? new Date().toISOString()
      : dateValue.toISOString();
  }

  const date = new Date(dateValue as number);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const convertToSerializableInvitation = (
  invitation: Invitation,
): SerializableInvitation => ({
  id: invitation.id,
  email: invitation.email,
  role: invitation.role,
  status: invitation.status,
  createdAt: safeToISOString(invitation.createdAt),
  expiresAt: safeToISOString(invitation.expiresAt),
});

export async function getPendingInvitations(organizationSlug: string): Promise<{
  pendingInvitations: SerializableInvitation[];
}> {
  const program = pipe(
    Effect.gen(function* (_) {
      const invitationProgram = InvitationDOService.pipe(
        Effect.flatMap((service) => service.list(organizationSlug)),
      );

      const fullLayer = InvitationDOLive({
        ORG_DO: env.ORG_DO,
      });

      const invitations = yield* _(
        Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              invitationProgram.pipe(Effect.provide(fullLayer)),
            ),
          catch: (_error) => {
            return new InvitationListError("Failed to fetch invitations");
          },
        }),
      );

      // Filter for pending invitations and convert to serializable format
      const pendingInvitations = (invitations as Invitation[])
        .filter((invitation) => invitation.status === "pending")
        .map(convertToSerializableInvitation);

      return { pendingInvitations };
    }),
    Effect.catchAll((_error) => {
      // Return empty array on error to prevent breaking the UI
      return Effect.succeed({ pendingInvitations: [] });
    }),
  );

  return Effect.runPromise(program);
}
