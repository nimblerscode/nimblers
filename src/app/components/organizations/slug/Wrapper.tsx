"use client";

import type { SerializableInvitation } from "@/app/actions/invitations/list";
import type { getUserOrganizations } from "@/app/actions/organization/get";
import { Container, VStack } from "@/app/design-system";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import { MainLayout } from "../../layout/MainLayout";
import { Header } from "./Header";
import { Tabs } from "./Tabs";

export function Wrapper({
  organization,
  members,
  activeTab,
  user,
  organizations = [],
  activeOrganizationId,
  pendingInvitations = [],
  currentPath,
}: {
  organization: Organization;
  members: User[];
  activeTab: string;
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
}) {
  return (
    <MainLayout
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={pendingInvitations.length}
      currentPath={currentPath}
    >
      <Container maxW="6xl" mx="auto" py="6">
        <VStack gap="6" alignItems="stretch">
          <Header organizationName={organization.name} />
          <Tabs
            user={user}
            organization={organization}
            members={members}
            activeTab={activeTab}
            pendingInvitations={pendingInvitations}
          />
        </VStack>
      </Container>
    </MainLayout>
  );
}
