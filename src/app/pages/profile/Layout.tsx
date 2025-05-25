"use server";

import type { RequestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import ProfilePage from "@/app/pages/profile/ProfilePage";

export async function Layout({ ctx }: RequestInfo) {
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

  return <ProfilePage user={user} initialOrganizations={[]} />;
} 
