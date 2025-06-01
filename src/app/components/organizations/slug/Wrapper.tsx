"use client";

import type { SerializableInvitation } from "@/app/actions/invitations/list";
import type { getUserOrganizations } from "@/app/actions/organization/get";
import { Container, VStack } from "@/app/design-system";
import type { ShopDomain } from "@/domain/global/organization/models";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import { MainLayout } from "../../layout/MainLayout";
import { Header } from "./Header";
import { OrganizationDashboard } from "./OrganizationDashboard";

interface ConnectedStore {
  id: string;
  shopDomain: ShopDomain;
  status: "active" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt: string | null;
}

export function Wrapper({
  organization,
  members,
  user,
  organizations = [],
  activeOrganizationId,
  pendingInvitations = [],
  currentPath,
  shopifyData,
}: {
  organization: Organization;
  members: User[];
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
  organizations?: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  pendingInvitations?: SerializableInvitation[];
  currentPath?: string;
  shopifyData: {
    clientId: string;
    connectedStores: ConnectedStore[];
    oauthMessage: {
      type: "success" | "error";
      message: string;
    } | null;
  };
}) {
  console.log("shopifyData", shopifyData);
  return (
    <MainLayout
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={pendingInvitations.length}
      currentPath={currentPath}
    >
      <Container maxW="8xl" mx="auto" py="6">
        <VStack gap="6" alignItems="stretch">
          <Header organizationName={organization.name} />
          <OrganizationDashboard
            user={user}
            organization={organization}
            members={members}
            pendingInvitations={pendingInvitations}
            shopifyData={shopifyData}
          />
        </VStack>
      </Container>
    </MainLayout>
  );
}
