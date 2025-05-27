"use client";

import type { getUserOrganizations } from "@/app/actions/organization/get";
import {
  Heading,
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarProvider,
  useSidebar,
  VStack,
} from "@/app/design-system";
import { Home, LogOut, User } from "@/app/design-system/icons";
import { authClient } from "@/app/lib/authClient";

interface AppSidebarProps {
  user?: {
    id: any;
    email: any;
    name: string | null;
    image: string | null;
    role: null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  organizations?: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  pendingInvitations?: number;
  currentPath?: string;
}

export function AppSidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      {children}
    </SidebarProvider>
  );
}

export function AppSidebar({
  user,
  organizations = [],
  activeOrganizationId,
  pendingInvitations = 0,
  currentPath = "",
}: AppSidebarProps) {
  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path);
  };

  // Find the active organization details
  const activeOrganization = organizations.find(
    (org) => org.id === activeOrganizationId,
  );
  const activeOrgSlug = activeOrganization?.slug;

  const getOrgPath = (path: string) => {
    if (activeOrgSlug) {
      return `/organization/${activeOrgSlug}${path}`;
    }
    return path;
  };

  const isOrganizationActive = () => {
    if (activeOrgSlug) {
      return isActive(`/organization/${activeOrgSlug}`);
    }
    return false;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <VStack gap="3" alignItems="stretch">
          <Heading as="h2" levelStyle="h4" color="brand.solid">
            Nimblers
          </Heading>

          {/* Organization Selector moved to Profile page */}
        </VStack>
      </SidebarHeader>

      {/* Organization Section - Only show when there's an active organization */}
      {activeOrganization && (
        <SidebarGroup
          title={activeOrganization.name || activeOrganization.slug}
        >
          <SidebarItem
            icon={Home}
            label="Overview"
            href={getOrgPath("")}
            active={isOrganizationActive()}
            badge={pendingInvitations > 0 ? pendingInvitations : undefined}
          />
        </SidebarGroup>
      )}

      {/* Profile Section */}
      <SidebarGroup title="Account">
        <SidebarItem
          icon={User}
          label="Profile"
          href="/profile"
          active={isActive("/profile")}
        />
      </SidebarGroup>

      {/* Sign Out */}
      <SidebarFooter>
        <SidebarItem
          icon={LogOut}
          label="Sign Out"
          onClick={async () => {
            try {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/login";
                  },
                },
              });
            } catch (_error) {
              // Fallback redirect if signOut fails
              window.location.href = "/login";
            }
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

// Main content component that responds to sidebar state
function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      style={{
        position: "absolute",
        top: 0,
        left: isCollapsed ? "64px" : "256px",
        right: 0,
        bottom: 0,
        overflow: "auto",
        transition: "none", // Remove transition to prevent animation
        backgroundColor: "var(--colors-page-background)",
        color: "var(--colors-page-foreground)",
      }}
    >
      {children}
    </main>
  );
}

// Layout component that combines sidebar with main content
export function AppLayout({
  children,
  user,
  organizations,
  activeOrganizationId,
  pendingInvitations,
  currentPath,
  sidebarCollapsed = false,
}: {
  children: React.ReactNode;
  user?: AppSidebarProps["user"];
  organizations?: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  pendingInvitations?: number;
  currentPath?: string;
  sidebarCollapsed?: boolean;
}) {
  return (
    <AppSidebarProvider defaultCollapsed={sidebarCollapsed}>
      <div
        style={{ position: "relative", height: "100vh", overflow: "hidden" }}
      >
        <AppSidebar
          user={user}
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
          pendingInvitations={pendingInvitations}
          currentPath={currentPath}
        />
        <MainContent>{children}</MainContent>
      </div>
    </AppSidebarProvider>
  );
}
