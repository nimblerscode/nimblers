"use client";

import type { getUserOrganizations } from "@/app/actions/organization/get";
import { Container, Heading, VStack } from "@/app/design-system";
import { CreateOrganization } from "../../../components/organizations/create/Create";
import { MainLayout } from "../../layout/MainLayout";

interface CreateWrapperProps {
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
  currentPath?: string;
}

export function CreateWrapper({
  user,
  organizations = [],
  activeOrganizationId,
  currentPath,
}: CreateWrapperProps) {
  return (
    <MainLayout
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      currentPath={currentPath}
    >
      <Container
        display="flex"
        maxW="6xl"
        mx="auto"
        alignItems="center"
        minH="100vh"
        justifyContent="center"
      >
        <VStack gap="6" w="full" maxW="8xl" alignItems="stretch">
          <Heading as="h1" levelStyle="h2">
            Create Organization
          </Heading>
          <CreateOrganization />
        </VStack>
      </Container>
    </MainLayout>
  );
}
