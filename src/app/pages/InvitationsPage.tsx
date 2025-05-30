import { env } from "cloudflare:workers";
import { Effect } from "effect";
import type { RequestInfo } from "rwsdk/worker";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import { AcceptInvitationForm } from "../components/invite/AcceptInvitationForm";

// This is a server component (no "use client" directive)
export default async function InvitationsPage({ params }: RequestInfo) {
  const { token } = params;

  if (!token) {
    return <div>Invalid invitation: No token provided</div>;
  }

  // Fetch invitation data on the server
  const invitationProgram = InvitationDOService.pipe(
    Effect.flatMap((service) => service.get(token)),
  );

  const fullLayer = InvitationDOLive({
    ORG_DO: env.ORG_DO,
  });

  try {
    // Run the Effect directly to get the invitation
    const invitation = await Effect.runPromise(
      invitationProgram.pipe(Effect.provide(fullLayer)),
    );

    if (!invitation) {
      return <div>Invitation not found</div>;
    }

    // Render the component with the invitation data
    return (
      <div>
        <h1>Invitation Details</h1>
        <p>
          <strong>Email:</strong> {invitation.email}
        </p>
        <p>
          <strong>Role:</strong> {invitation.role}
        </p>
        <p>
          <strong>Status:</strong> {invitation.status}
        </p>
        <p>
          <strong>Expires At:</strong>{" "}
          {new Date(invitation.expiresAt).toLocaleString()}
        </p>
        <AcceptInvitationForm token={token} />
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 bg-red-100 rounded-md text-red-800">
        <h2 className="font-bold">Error</h2>
        <p>
          {error instanceof Error ? error.message : "Failed to load invitation"}
        </p>
      </div>
    );
  }
}
