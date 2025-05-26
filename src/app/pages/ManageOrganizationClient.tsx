"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";

// import { switchActiveOrganization } from "@/app/actions/organization/create";

// Define the expected shape of an organization object (mirroring switcher)
type OrganizationInfo = {
  organizationId: string;
  name: string | null;
  slug: string;
};

interface ManageOrganizationClientProps {
  orgSlug: string; // Slug from the URL parameter
  activeOrganizationId: string | null; // Currently active org ID from session
  organizations: OrganizationInfo[]; // List of orgs user belongs to
  children: ReactNode; // The actual page content to render
}

export default function ManageOrganizationClient({
  orgSlug,
  activeOrganizationId,
  organizations,
  children,
}: ManageOrganizationClientProps) {
  const [isSwitching, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Find the organization ID that corresponds to the slug in the URL
    const targetOrg = organizations.find((org) => org.slug === orgSlug);
    const targetOrgId = targetOrg?.organizationId;

    // Clear previous feedback on slug change
    setFeedback(null);

    if (!targetOrgId) {
      setFeedback(
        `Error: Organization slug "${orgSlug}" not found or you're not a member.`,
      );
      // TODO: Optionally redirect to a known good state, like the root or org creation page
      // window.location.href = '/';
      return;
    }

    // Check if the target org from the slug is different from the active org in the session
    if (
      targetOrgId &&
      activeOrganizationId &&
      targetOrgId !== activeOrganizationId
    ) {
      setFeedback("Syncing active organization with URL...");

      startTransition(async () => {
        try {
          const result = await switchActiveOrganization(targetOrgId);

          if (result.success) {
            setFeedback("Organization synced successfully! Reloading...");
            // Reload the page to ensure all server components re-render with the new session context
            window.location.reload();
          } else {
            setFeedback(`Error syncing organization: ${result.message}`);
            // TODO: Handle failure - maybe redirect to the previously active org's page?
            // const previousActiveOrg = organizations.find(org => org.organizationId === activeOrganizationId);
            // if (previousActiveOrg) window.location.href = `/${previousActiveOrg.slug}/manage`;
            // else window.location.href = '/'; // Fallback redirect
          }
        } catch (_error) {
          setFeedback(
            "An unexpected error occurred while syncing organization.",
          );
        }
      });
    } else if (targetOrgId === activeOrganizationId) {
      // Optionally clear feedback if it was showing the switching message
      // setFeedback(null); // Or let it fade naturally
    }

    // Dependency array: run this effect when the slug, active ID, or org list changes
    // Note: Stringifying organizations might be inefficient if the list is large and changes often,
    // but is safer than potentially missing a change. Consider passing a stable count or map if performance is an issue.
  }, [orgSlug, activeOrganizationId, organizations]);

  return (
    <div>
      {/* Display switching feedback if any */}
      {isSwitching && <span> Syncing organization...</span>}
      {feedback && (
        <p
          style={{
            color: feedback.startsWith("Error") ? "red" : "green",
            marginTop: "5px",
          }}
        >
          {feedback}
        </p>
      )}

      {/* Render the actual page content passed from the server component */}
      {children}
    </div>
  );
}
