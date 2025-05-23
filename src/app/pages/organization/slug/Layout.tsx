"use server";
import type { RequestInfo } from "rwsdk/worker";
import { getOrganization } from "@/app/actions/organization/get";
import { Wrapper } from "../../../components/organizations/slug/Wrapper";
import { getMembers } from "@/app/actions/members/get";
import { getPendingInvitations } from "@/app/actions/invitations/list";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

export async function Layout({ params, ctx }: RequestInfo) {
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

  return (
    <Wrapper
      user={user}
      organization={org}
      members={members}
      activeTab={params.tab}
      pendingInvitations={pendingInvitations}
    />
  );
}
