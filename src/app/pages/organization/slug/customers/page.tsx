import { getCustomers } from "@/app/actions/customers/list";
import { getSegments } from "@/app/actions/segments/list";
import { CustomersPageWrapper } from "./CustomersPageWrapper";

interface CustomerPageProps {
  params: {
    orgSlug: string;
  };
}

export default async function CustomerPage({
  params,
}: CustomerPageProps) {
  // Fetch customers and segments in parallel
  const [customersResult, segmentsResult] = await Promise.all([
    getCustomers(params.orgSlug as any),
    getSegments(params.orgSlug),
  ]);

  const { customers } = customersResult;
  const { segments } = segmentsResult;

  // Ensure data is properly serialized for client components
  const serializedCustomers = JSON.parse(JSON.stringify(customers));
  const serializedSegments = JSON.parse(JSON.stringify(segments));

  return (
    <CustomersPageWrapper
      customers={serializedCustomers}
      segments={serializedSegments}
      organizationSlug={params.orgSlug}
    />
  );
}
