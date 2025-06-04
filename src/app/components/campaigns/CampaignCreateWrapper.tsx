"use client";

import { Container, VStack, Heading, Text } from "@/app/design-system";
import { MainLayout } from "@/app/components/layout/MainLayout";
import { CampaignCreateForm } from "./CampaignCreateForm";

interface CampaignCreateWrapperProps {
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

export function CampaignCreateWrapper({ user, organizationSlug }: CampaignCreateWrapperProps) {
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
              Create New Campaign
            </Heading>
            <Text color="content.secondary">
              Set up a new messaging campaign for your organization.
            </Text>
          </VStack>

          <CampaignCreateForm organizationSlug={organizationSlug} />
        </VStack>
      </Container>
    </MainLayout>
  );
} 
