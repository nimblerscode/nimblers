"use client";

import { Container, VStack, Heading, Text, Button, HStack, Card, CardContent } from "@/app/design-system";
import { MainLayout } from "@/app/components/layout/MainLayout";
import { Link } from "@/app/design-system/Link";
import type { SerializableCampaign } from "@/app/actions/campaigns/list";

interface CampaignsListWrapperProps {
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
  campaigns: SerializableCampaign[];
  hasMore: boolean;
  cursor: string | null;
}

export function CampaignsListWrapper({ user, organizationSlug, campaigns, hasMore, cursor }: CampaignsListWrapperProps) {
  return (
    <MainLayout
      user={user}
      organizations={[]}
      activeOrganizationId={null}
      pendingInvitations={0}
    >
      <Container maxW="6xl" mx="auto" py="8">
        <VStack gap="6" alignItems="stretch">
          <HStack justifyContent="space-between" alignItems="center">
            <VStack gap="2" alignItems="flex-start">
              <Heading as="h1">
                Campaigns
              </Heading>
              <Text color="content.secondary">
                Manage your messaging campaigns and create new ones.
              </Text>
            </VStack>

            <Link href={`/organization/${organizationSlug}/campaigns/create`}>
              <Button variant="primary" size="lg">
                Create Campaign
              </Button>
            </Link>
          </HStack>

          {/* Campaigns List */}
          {campaigns.length === 0 ? (
            <VStack gap="4" alignItems="center" py="12">
              <Text fontSize="lg" color="content.secondary">
                No campaigns found
              </Text>
              <Text color="content.tertiary">
                Get started by creating your first campaign
              </Text>
              <Link href={`/organization/${organizationSlug}/campaigns/create`}>
                <Button variant="primary">
                  Create Your First Campaign
                </Button>
              </Link>
            </VStack>
          ) : (
            <VStack gap="4" alignItems="stretch">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent p="6">
                    <VStack gap="4" alignItems="stretch">
                      <HStack justifyContent="space-between" alignItems="flex-start">
                        <VStack gap="2" alignItems="flex-start">
                          <Heading as="h3">{campaign.name}</Heading>
                          {campaign.description && (
                            <Text color="content.secondary">{campaign.description}</Text>
                          )}
                        </VStack>
                        <VStack gap="1" alignItems="flex-end">
                          <Text fontSize="sm" color="content.secondary">
                            {campaign.campaignType.toUpperCase()}
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" color={
                            campaign.status === "active" ? "green.600" :
                              campaign.status === "draft" ? "gray.600" :
                                campaign.status === "scheduled" ? "blue.600" :
                                  campaign.status === "paused" ? "yellow.600" :
                                    "red.600"
                          }>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Text>
                        </VStack>
                      </HStack>

                      <HStack gap="4" fontSize="sm" color="content.secondary">
                        <Text>Created: {new Date(campaign.createdAt).toLocaleDateString()}</Text>
                        <Text>•</Text>
                        <Text>Timezone: {campaign.timezone}</Text>
                        <Text>•</Text>
                        <Text>Segments: {campaign.segmentIds.length}</Text>
                      </HStack>
                    </VStack>
                  </CardContent>
                </Card>
              ))}

              {hasMore && (
                <HStack justifyContent="center">
                  <Button variant="secondary" size="md">
                    Load More
                  </Button>
                </HStack>
              )}
            </VStack>
          )}
        </VStack>
      </Container>
    </MainLayout>
  );
} 
