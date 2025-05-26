import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import type { RequestInfo } from "rwsdk/worker";
import { ExpiredInvitationCard } from "@/app/components/invite/ExpiredInvitationCard";
import { InvalidInvitationCard } from "@/app/components/invite/InvalidInvitationCard";
import { InvitationLandingPage } from "@/app/components/invite/InvitationLandingPage";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { DatabaseLive, InvitationDOLive } from "@/config/layers";
import type { Email } from "@/domain/global/email/model";
import type { User } from "@/domain/global/user/model";
import { UserRepo } from "@/domain/global/user/service";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";

// Using Response redirect instead of router redirect for server components

// Helper to get user by email using the UserRepo service
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const getUserProgram = UserRepo.pipe(
      Effect.flatMap((service) => service.findByEmail(email as Email)),
    );

    const userRepoLayer = UserRepoLive.pipe(
      Layer.provide(DatabaseLive({ DB: env.DB })),
    );

    const user = await Effect.runPromise(
      getUserProgram.pipe(Effect.provide(userRepoLayer)),
    );

    return user;
  } catch (_error) {
    return null;
  }
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
        <InvalidInvitationCard reason="This invitation has been revoked" />
      );
    }

    // Determine user state for the invitation landing page
    const invitedUser = await getUserByEmail(invitation.email);

    let userState:
      | "user_not_exists"
      | "user_exists_not_logged_in"
      | "user_logged_in_email_mismatch"
      | "user_logged_in_email_match";

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
    return (
      <InvalidInvitationCard reason="Failed to load invitation. Please try again later." />
    );
  }
}
