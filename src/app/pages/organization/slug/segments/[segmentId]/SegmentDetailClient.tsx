"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  VStack,
  HStack,
  Text,
  Heading,
  Pill,
  Button,
  Banner,
} from "@/app/design-system";
import type { SerializableSegment } from "@/app/actions/segments/list";

interface SegmentDetailClientProps {
  segment: SerializableSegment;
  organizationSlug: string;
}

export function SegmentDetailClient({ segment, organizationSlug }: SegmentDetailClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "warning";
      default:
        return "info";
    }
  };

  const handleBackClick = () => {
    window.location.href = `/organization/${organizationSlug}/segments`;
  };

  return (
    <VStack gap="6" alignItems="stretch">
      {/* Back button */}
      <VStack gap="4" alignItems="flex-start">
        <Button variant="outline" onClick={handleBackClick}>
          ← Back to Segments
        </Button>
      </VStack>

      {/* Header */}
      <HStack justifyContent="space-between" alignItems="center">
        <VStack gap="1" alignItems="flex-start">
          <Heading as="h1">{segment.name}</Heading>
          <Text color="gray">
            {segment.description || "No description provided"}
          </Text>
        </VStack>

        <HStack gap="3">
          <Pill variant={getStatusVariant(segment.status)} size="sm">
            {segment.status}
          </Pill>
          <Pill variant="info" size="sm">
            {segment.type.toUpperCase()}
          </Pill>
        </HStack>
      </HStack>

      <HStack gap="6" alignItems="flex-start">
        {/* Segment Details */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Segment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <VStack gap="4" alignItems="stretch">
              <HStack justifyContent="space-between">
                <Text color="gray">Name</Text>
                <Text css={{ fontWeight: "medium" }}>{segment.name}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Description</Text>
                <Text css={{ fontWeight: "medium" }}>{segment.description || "No description"}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Type</Text>
                <Text css={{ fontWeight: "medium" }}>{segment.type}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Status</Text>
                <Text css={{ fontWeight: "medium" }}>{segment.status}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Customer Count</Text>
                <Text css={{ fontWeight: "medium" }}>{segment.customerCount || 0}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Created</Text>
                <Text css={{ fontWeight: "medium" }}>{formatDate(segment.createdAt)}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="gray">Last Updated</Text>
                <Text css={{ fontWeight: "medium" }}>{formatDate(segment.updatedAt)}</Text>
              </HStack>
              {segment.lastSyncAt && (
                <HStack justifyContent="space-between">
                  <Text color="gray">Last Sync</Text>
                  <Text css={{ fontWeight: "medium" }}>{formatDate(segment.lastSyncAt)}</Text>
                </HStack>
              )}
            </VStack>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <VStack gap="4" className="w-80">
          <Card>
            <CardContent className="p-4">
              <VStack gap="1" alignItems="flex-start">
                <Text css={{ fontWeight: "bold" }}>
                  {segment.customerCount || 0}
                </Text>
                <Text color="gray">
                  Total Customers
                </Text>
              </VStack>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <VStack gap="1" alignItems="flex-start">
                <Text css={{ fontWeight: "bold" }}>
                  {formatDate(segment.createdAt)}
                </Text>
                <Text color="gray">
                  Created On
                </Text>
              </VStack>
            </CardContent>
          </Card>
        </VStack>
      </HStack>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <HStack justifyContent="space-between" alignItems="center">
            <CardTitle>Customers ({segment.customerCount || 0})</CardTitle>
            <Button variant="outline" size="sm">
              Add Customers
            </Button>
          </HStack>
        </CardHeader>
        <CardContent>
          <Banner variant="info">
            <Text>
              {segment.customerCount === 0
                ? "No customers in this segment yet."
                : `This segment contains ${segment.customerCount || 0} customers. Customer list functionality will be enhanced in the next iteration.`
              }
            </Text>
          </Banner>
        </CardContent>
      </Card>
    </VStack>
  );
} 
