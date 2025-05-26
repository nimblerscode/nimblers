"use client";

import type { getUserOrganizations } from "@/app/actions/organization/get";
import ProfilePage from "@/app/pages/profile/ProfilePage";
import { MainLayout } from "../layout/MainLayout";

interface ProfileWrapperProps {
  user: {
    id: any;
    email: any;
    name: string | null;
    image: string | null;
    role: null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  organizations: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  currentPath?: string;
}

export function ProfileWrapper({
  user,
  organizations,
  activeOrganizationId,
  currentPath,
}: ProfileWrapperProps) {
  return (
    <MainLayout
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      currentPath={currentPath}
    >
      <ProfilePage user={user} organizations={organizations} />
    </MainLayout>
  );
}
