"use server";

import type { RequestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { getUserOrganizations } from "@/app/actions/organization/get";
import { getActiveOrganization } from "@/app/actions/organization/switch";
import { ProfileWrapper } from "@/app/components/profile/ProfileWrapper";

export async function Layout({ ctx, request }: RequestInfo) {
  const appCtx = ctx as AppContext;

  if (!appCtx.user) {
    throw new Error("User not found in context");
  }

  const user = {
    ...appCtx.user,
    id: appCtx.user.id as any,
    email: appCtx.user.email as any,
    name: appCtx.user.name || null,
    image: appCtx.user.image || null,
    role: null,
  };

  // Fetch organizations data and active organization
  let organizations: Awaited<ReturnType<typeof getUserOrganizations>>;
  let activeOrganizationId: string | null;

  try {
    [organizations, activeOrganizationId] = await Promise.all([
      getUserOrganizations(),
      getActiveOrganization()
    ]);
  } catch (error) {
    console.error("Failed to fetch organizations or active organization:", error);
    organizations = [];
    activeOrganizationId = null;
  }

  // Get current path for sidebar active state
  const url = new URL(request.url);
  const currentPath = url.pathname;

  return (
    <ProfileWrapper
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      currentPath={currentPath}
    />
  );
} 
