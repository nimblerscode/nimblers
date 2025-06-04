"use server";

import type { RequestInfo } from "rwsdk/worker";
import { CampaignsListWrapper } from "@/app/components/campaigns/CampaignsListWrapper";
import { listCampaignsAction } from "@/app/actions/campaigns/list";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

export async function CampaignsListPage({ params, ctx }: RequestInfo) {
  const { orgSlug } = params;
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
    emailVerified: appCtx.user.emailVerified,
    createdAt: appCtx.user.createdAt,
    updatedAt: appCtx.user.updatedAt,
  };

  // Fetch campaigns for this organization
  const campaignsResult = await listCampaignsAction(orgSlug, { limit: 50 });

  return (
    <CampaignsListWrapper
      user={user}
      organizationSlug={orgSlug}
      campaigns={campaignsResult.campaigns}
      hasMore={campaignsResult.hasMore}
      cursor={campaignsResult.cursor}
    />
  );
} 
