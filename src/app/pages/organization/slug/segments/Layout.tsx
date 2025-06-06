"use server";

import type { RequestInfo } from "rwsdk/worker";
import { SegmentsListWrapper } from "@/app/components/segments/SegmentsListWrapper";
import { getSegments } from "@/app/actions/segments/list";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

export async function Layout({ params, ctx }: RequestInfo) {
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

  // Fetch segments for this organization
  const { segments } = await getSegments(orgSlug);

  return (
    <SegmentsListWrapper
      user={user}
      organizationSlug={orgSlug}
      segments={segments}
      hasMore={false}
      cursor={null}
    />
  );
} 
