"use client";

import { VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/design-system/Card";
import { CustomerCreateForm } from "@/app/components/customers/CustomerCreateForm";
import type { SerializableCustomer } from "@/app/actions/customers/list";
import type { SerializableSegment } from "@/app/actions/segments/list";
import { CustomersListWithSegments } from "@/app/components/customers/CustomersListWithSegments";

interface CustomerManagementClientProps {
  customers: SerializableCustomer[];
  segments: SerializableSegment[];
  organizationSlug: string;
}

export function CustomerManagementClient({
  customers,
  segments,
  organizationSlug,
}: CustomerManagementClientProps) {
  return (
    <VStack gap="4">
      {/* Create Customer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerCreateForm organizationSlug={organizationSlug} />
        </CardContent>
      </Card>

      {/* Customer List with Segment Management */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length > 0 ? (
            <CustomersListWithSegments
              customers={customers}
              segments={segments}
              organizationSlug={organizationSlug}
            />
          ) : (
            <VStack gap="4" style={{ padding: "2rem", alignItems: "center" }}>
              <Text color="gray.600">No customers found</Text>
              <Text css={{ fontSize: "sm" }} color="gray.500">
                Create your first customer using the form above
              </Text>
            </VStack>
          )}
        </CardContent>
      </Card>
    </VStack>
  );
} 
