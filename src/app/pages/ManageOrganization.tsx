"use server";
import React from "react"; // Import React for Suspense
import { getOrganizationsForUser } from "@/app/actions/organization/create"; // Import the server action
import InviteMemberForm from "@/app/components/InviteMemberForm";
import LogoutButton from "@/app/components/LogoutButton";
import type { AppContext } from "@/infrastructure/cloudflare/worker"; // Import the context type
import ManageOrganizationClient from "./ManageOrganizationClient"; // Import the new client wrapper

// Define the expected shape of organization data (can be shared or redefined)
type OrganizationInfo = {
  organizationId: string;
  name: string | null;
  slug: string;
};

// Define the props for the main server component, including params
interface ManageOrganizationProps {
  ctx: AppContext;
  params: { orgSlug: string }; // Get orgSlug from route parameters
}

// Define the props for the async container (can stay internal)
interface OrganizationListContainerProps {
  userId: string;
  activeOrganizationId: string | null;
  organizations: OrganizationInfo[]; // Pass fetched orgs down
}

// Async component to render the switcher (can be simplified or merged)
async function OrganizationListContainer({
  userId,
  activeOrganizationId,
  organizations, // Receive organizations as prop
}: OrganizationListContainerProps) {
  // Data fetching is now done in the parent ManageOrganization component
  // const organizationData = await getOrganizationsForUser(userId);

  if (!organizations || organizations.length === 0) {
    return (
      <p>
        You are not a member of any organizations yet. You can create one or
        wait for an invite.
      </p>
    );
  }

  return (
    <div>
      <p>Organizations</p>
      {/* <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
        userId={userId}
      /> */}
    </div>
  );
}

// Main Server Component
async function ManageOrganization({ ctx, params }: ManageOrganizationProps) {
  const { user, session } = ctx;
  const { orgSlug } = params; // Extract slug from route parameters

  if (!user || !session) {
    return <p>Loading user data or redirecting...</p>;
  }

  const userId = session.userId;

  // Fetch organization list once here
  const organizations = await getOrganizationsForUser(userId);

  // Check if the current slug corresponds to a valid organization for the user
  // This check could also be done inside the client component, but doing it here prevents
  // rendering the client wrapper unnecessarily if the slug is fundamentally invalid.
  const currentOrgFromSlug = organizations.find((org) => org.slug === orgSlug);
  if (!currentOrgFromSlug) {
    return (
      <div>
        <h2>Error</h2>
        <p>Organization not found or you do not have access.</p>
        <a href="/">Go back</a> {/* Or link to org creation / selection */}
      </div>
    );
  }

  return (
    // Wrap the main content with the Client Component
    <ManageOrganizationClient
      orgSlug={orgSlug}
      activeOrganizationId={activeOrganizationId}
      organizations={organizations} // Pass the fetched list
    >
      {/* Pass the actual UI as children */}
      <div>
        <h2>Manage Organization: {currentOrgFromSlug.name || orgSlug}</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p>Welcome, {user.name || user.email}!</p>
          {/* Place switcher and logout within the standard layout */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <React.Suspense fallback={<p>Loading switcher...</p>}>
              <OrganizationListContainer
                userId={userId}
                activeOrganizationId={activeOrganizationId} // Pass current active ID
                organizations={organizations} // Pass the list again
              />
            </React.Suspense>
            <LogoutButton />
          </div>
        </div>

        <hr />

        {/* Invite Member Form - Conditionally render based on resolved active ID */}
        {activeOrganizationId ? (
          <>
            <h3>Invite New Member</h3>
            <InviteMemberForm />
          </>
        ) : (
          <p>No active organization selected in session.</p> // This state might occur briefly during switch
        )}

        {/* Add other management components here */}
        <p>
          Content specific to organization ID:{" "}
          {currentOrgFromSlug.organizationId}
        </p>
      </div>
    </ManageOrganizationClient>
  );
}

export default ManageOrganization;
