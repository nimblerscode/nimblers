"use client";

import { Container, VStack, Heading, Text } from "@/app/design-system";
import { MainLayout } from "@/app/components/layout/MainLayout";
import { SegmentCreateForm } from "./SegmentCreateForm";

interface SegmentCreateWrapperProps {
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
  organizationSlug: string;
}

export function SegmentCreateWrapper({ user, organizationSlug }: SegmentCreateWrapperProps) {
  return (
    <MainLayout
      user={user}
      organizations={[]}
      activeOrganizationId={null}
      pendingInvitations={0}
    >
      <Container maxW="4xl" mx="auto" py="8">
        <VStack gap="6" alignItems="stretch">
          <VStack gap="2" alignItems="flex-start">
            <Heading as="h1">
              Create New Segment
            </Heading>
            <Text color="content.secondary">
              Set up a new customer segment for your organization.
            </Text>
          </VStack>

          <SegmentCreateForm organizationSlug={organizationSlug} />
        </VStack>
      </Container>
    </MainLayout>
  );
} 
