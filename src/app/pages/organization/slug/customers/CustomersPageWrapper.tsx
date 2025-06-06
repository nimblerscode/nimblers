"use client";

import { VStack, HStack } from "@/app/design-system/Layout";
import { Heading } from "@/app/design-system/Heading";
import { Text } from "@/app/design-system/Text";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/design-system/Card";
import { CustomerManagementClient } from "./CustomerManagementClient";
import type { SerializableCustomer } from "@/app/actions/customers/list";
import type { SerializableSegment } from "@/app/actions/segments/list";

interface CustomersPageWrapperProps {
  customers: SerializableCustomer[];
  segments: SerializableSegment[];
  organizationSlug: string;
}

export function CustomersPageWrapper({
  customers,
  segments,
  organizationSlug,
}: CustomersPageWrapperProps) {
  return (
    <VStack gap="6" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <VStack gap="1">
        <Heading as="h1">Customers</Heading>
        <Text color="gray.600">
          Manage your customer database and segment memberships
        </Text>
      </VStack>

      {/* Stats Cards */}
      <HStack gap="4">
        <Card style={{ flex: 1 }}>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Text css={{ fontSize: "2xl", fontWeight: "bold" }}>{customers.length}</Text>
            <Text css={{ fontSize: "sm" }} color="gray.600">Active customer profiles</Text>
          </CardContent>
        </Card>

        <Card style={{ flex: 1 }}>
          <CardHeader>
            <CardTitle>Total Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <Text css={{ fontSize: "2xl", fontWeight: "bold" }}>{segments.length}</Text>
            <Text css={{ fontSize: "sm" }} color="gray.600">All segment types</Text>
          </CardContent>
        </Card>
      </HStack>

      {/* Client Component for Customer Management */}
      <CustomerManagementClient
        customers={customers}
        segments={segments}
        organizationSlug={organizationSlug}
      />
    </VStack>
  );
} 
