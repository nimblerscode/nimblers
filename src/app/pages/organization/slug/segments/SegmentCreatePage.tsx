"use server";

import type { RequestInfo } from "rwsdk/worker";
import { SegmentCreateWrapper } from "@/app/components/segments/SegmentCreateWrapper";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

export async function SegmentCreatePage({ params, ctx }: RequestInfo) {
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

  return (
    <SegmentCreateWrapper
      user={user}
      organizationSlug={orgSlug}
    />
  );
} 
