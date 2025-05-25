
import { ExpiredInvitationCard } from "@/app/components/invite/ExpiredInvitationCard";
import { InvalidInvitationCard } from "@/app/components/invite/InvalidInvitationCard";
import { InvitationLandingPage } from "@/app/components/invite/InvitationLandingPage";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import { env } from "cloudflare:workers";
import { Effect } from "effect";
import type { RequestInfo } from "rwsdk/worker";
// Using Response redirect instead of router redirect for server components

// Helper to get user by email - you'll need to implement this based on your user service
async function getUserByEmail(email: string) {
  // TODO: Implement user lookup logic
  // This should check if a user exists with the given email
  return null; // Placeholder
}

// This is a server component (no "use client" directive)
export default async function AcceptInvitePage({ params, ctx }: RequestInfo) {
  const { token } = params;
  const currentUser = (ctx as any)?.user; // Current logged-in user from context

  if (!token || typeof token !== "string") {
    return <InvalidInvitationCard reason="No invitation token provided" />;
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
      return <InvalidInvitationCard reason="Invitation not found" />;
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      return (
        <ExpiredInvitationCard
          organizationName="Organization" // TODO: Get actual org name
          expiresAt={expiresAt}
        />
      );
    }

    // Check if invitation is already accepted
    if (invitation.status === "accepted") {
      return (
        <InvalidInvitationCard
          reason="This invitation has already been accepted"
          showLoginLink
        />
      );
    }

    // Check if invitation is revoked
    if (invitation.status === "revoked") {
      return (
        <InvalidInvitationCard
          reason="This invitation has been revoked"
        />
      );
    }

    // Determine user state for the invitation landing page
    const invitedUser = await getUserByEmail(invitation.email);

    let userState: "user_not_exists" | "user_exists_not_logged_in" | "user_logged_in_email_mismatch" | "user_logged_in_email_match";

    if (!invitedUser) {
      userState = "user_not_exists";
    } else if (!currentUser) {
      userState = "user_exists_not_logged_in";
    } else if (currentUser.email !== invitation.email) {
      userState = "user_logged_in_email_mismatch";
    } else {
      userState = "user_logged_in_email_match";
    }

    // Show invitation landing page instead of automatic redirects
    return (
      <InvitationLandingPage
        token={token}
        invitation={{
          email: invitation.email,
          role: invitation.role,
          organizationName: "Organization", // TODO: Get actual org name
          expiresAt: expiresAt,
        }}
        userState={userState}
        currentUser={currentUser}
      />
    );
  } catch (error) {
    // Handle redirect errors
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading invitation:", error);
    return (
      <InvalidInvitationCard
        reason="Failed to load invitation. Please try again later."
      />
    );
  }
} 
