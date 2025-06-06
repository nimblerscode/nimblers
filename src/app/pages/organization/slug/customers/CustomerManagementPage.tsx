import { VStack, HStack } from "@/app/design-system/Layout";
import { Heading } from "@/app/design-system/Heading";
import { Button } from "@/app/design-system/Button";
import { getCustomers } from "@/app/actions/customers/list";
import { getSegments } from "@/app/actions/segments/list";
import { CustomersListWithSegments } from "@/app/components/customers/CustomersListWithSegments";
import { CustomerCreateForm } from "@/app/components/customers/CustomerCreateForm";
import { Link } from "@/app/design-system/Link";

interface CustomerManagementPageProps {
  params: {
    orgSlug: string;
  };
}

export default async function CustomerManagementPage({
  params,
}: CustomerManagementPageProps) {
  // Fetch customers and segments in parallel
  const [customersResult, segmentsResult] = await Promise.all([
    getCustomers(params.orgSlug),
    getSegments(params.orgSlug),
  ]);

  return (
    <VStack gap="8" alignItems="stretch">
      {/* Header */}
      <HStack gap="4" justify="space-between">
        <VStack gap="2" alignItems="flex-start">
          <Heading as="h1">Customer Management</Heading>
          <p style={{ fontSize: "0.875rem", color: "gray", margin: 0 }}>
            Manage your customers and organize them into segments for targeted marketing.
          </p>
        </VStack>
        <HStack gap="3">
          <Link href={`/organization/${params.orgSlug}/segments`}>
            <Button variant="outline">
              Manage Segments
            </Button>
          </Link>
          <Link href={`/organization/${params.orgSlug}/customers/import`}>
            <Button variant="outline">
              Import Customers
            </Button>
          </Link>
        </HStack>
      </HStack>

      {/* Customer Creation Form */}
      <CustomerCreateForm organizationSlug={params.orgSlug} />

      {/* Customer List with Segment Management */}
      <CustomersListWithSegments
        customers={customersResult.customers}
        segments={segmentsResult.segments}
        organizationSlug={params.orgSlug}
      />
    </VStack>
  );
} 
