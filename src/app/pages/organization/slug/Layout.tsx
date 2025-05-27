"use server";
import type { RequestInfo } from "rwsdk/worker";
import { getPendingInvitations } from "@/app/actions/invitations/list";
import { getMembers } from "@/app/actions/members/get";
import {
  getOrganization,
  getUserOrganizations,
} from "@/app/actions/organization/get";
import { getActiveOrganization } from "@/app/actions/organization/switch";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Wrapper } from "../../../components/organizations/slug/Wrapper";

export async function Layout({ params, ctx, request }: RequestInfo) {
  const org = await getOrganization(params.orgSlug);
  const { members } = await getMembers(params.orgSlug);
  const { pendingInvitations } = await getPendingInvitations(params.orgSlug);
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
      getActiveOrganization(),
    ]);
  } catch (_error) {
    organizations = [];
    activeOrganizationId = null;
  }

  // Get current path for sidebar active state
  const url = new URL(request.url);
  const currentPath = url.pathname;

  return (
    <Wrapper
      organization={org}
      members={members}
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={pendingInvitations}
      currentPath={currentPath}
    />
  );
}
