"use client";

import { Link } from "react-aria-components";
import {
  Button,
  Card,
  CardContent,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
} from "@/app/design-system";
import { MainLayout } from "@/app/components/layout/MainLayout";
import type { SerializableSegment } from "@/app/actions/segments/list";

interface SegmentsListWrapperProps {
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
  segments: SerializableSegment[];
  hasMore: boolean;
  cursor: string | null;
}

export function SegmentsListWrapper({ user, organizationSlug, segments, hasMore, cursor }: SegmentsListWrapperProps) {
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
                Segments
              </Heading>
              <Text color="content.secondary">
                Manage your customer segments and create new ones.
              </Text>
            </VStack>

            <Link href={`/organization/${organizationSlug}/segments/create`}>
              <Button variant="primary" size="lg">
                Create Segment
              </Button>
            </Link>
          </HStack>

          {/* Segments List */}
          <VStack gap="4" alignItems="stretch">
            {segments.length === 0 ? (
              <Card>
                <CardContent>
                  <VStack gap="4" alignItems="center" py="8">
                    <Heading as="h3">No segments yet</Heading>
                    <Text color="content.secondary" textAlign="center">
                      Create your first customer segment to start organizing your audience.
                    </Text>
                    <Link href={`/organization/${organizationSlug}/segments/create`}>
                      <Button variant="primary" size="md">
                        Create Your First Segment
                      </Button>
                    </Link>
                  </VStack>
                </CardContent>
              </Card>
            ) : (
              segments.map((segment) => (
                <Card key={segment.id}>
                  <CardContent>
                    <VStack gap="3" alignItems="stretch">
                      <HStack justifyContent="space-between" alignItems="flex-start">
                        <VStack gap="2" alignItems="flex-start">
                          <Link href={`/organization/${organizationSlug}/segments/${segment.id}`}>
                            <Heading as="h3" css={{ cursor: "pointer", "&:hover": { color: "blue.600" } }}>
                              {segment.name}
                            </Heading>
                          </Link>
                          {segment.description && (
                            <Text color="content.secondary">{segment.description}</Text>
                          )}
                        </VStack>
                        <VStack gap="1" alignItems="flex-end">
                          <Text fontSize="sm" color="content.secondary">
                            {segment.type.toUpperCase()}
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" color={
                            segment.status === "active" ? "green.600" :
                              segment.status === "paused" ? "yellow.600" :
                                "red.600"
                          }>
                            {segment.status.charAt(0).toUpperCase() + segment.status.slice(1)}
                          </Text>
                        </VStack>
                      </HStack>

                      <HStack gap="4" fontSize="sm" color="content.secondary">
                        <Text>Created: {new Date(segment.createdAt).toLocaleDateString()}</Text>
                        <Text>•</Text>
                        <Text>Type: {segment.type}</Text>
                        {segment.lastSyncAt && (
                          <>
                            <Text>•</Text>
                            <Text>Last Sync: {new Date(segment.lastSyncAt).toLocaleDateString()}</Text>
                          </>
                        )}
                      </HStack>
                    </VStack>
                  </CardContent>
                </Card>
              ))
            )}
          </VStack>

          {/* Load More */}
          {hasMore && (
            <HStack justifyContent="center">
              <Button variant="outline" size="md">
                Load More Segments
              </Button>
            </HStack>
          )}
        </VStack>
      </Container>
    </MainLayout>
  );
} 
