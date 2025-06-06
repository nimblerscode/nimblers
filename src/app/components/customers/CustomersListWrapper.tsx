import { Suspense } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, VStack, HStack } from "@/app/design-system";
import { getCustomers } from "@/app/actions/customers/list";
import { CustomersList } from "./CustomersList";

interface CustomersListWrapperProps {
  organizationSlug: string;
}

export async function CustomersListWrapper({ organizationSlug }: CustomersListWrapperProps) {
  const { customers, total } = await getCustomers(organizationSlug as any);

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between" alignItems="center">
          <VStack gap="1" alignItems="flex-start">
            <CardTitle>Customers</CardTitle>
            <span style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)" }}>
              {total} customer{total !== 1 ? "s" : ""} total
            </span>
          </VStack>
          <Button variant="primary" size="sm">
            Add Customer
          </Button>
        </HStack>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<div>Loading customers...</div>}>
          <CustomersList customers={customers} organizationSlug={organizationSlug} />
        </Suspense>
      </CardContent>
    </Card>
  );
} 
