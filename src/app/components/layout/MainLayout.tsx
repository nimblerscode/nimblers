"use client";

import type { getUserOrganizations } from "@/app/actions/organization/get";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import { AppLayout } from "./AppSidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  user?: User;
  organization?: Organization; // Keep for backward compatibility
  organizations?: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  pendingInvitations?: number;
  currentPath?: string;
  sidebarCollapsed?: boolean;
}

export function MainLayout({
  children,
  user,
  organization, // Legacy prop - will be deprecated
  organizations = [],
  activeOrganizationId,
  pendingInvitations = 0,
  currentPath,
  sidebarCollapsed = false,
}: MainLayoutProps) {
  return (
    <AppLayout
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={pendingInvitations}
      currentPath={currentPath}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AppLayout>
  );
}
