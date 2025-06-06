import { VStack } from "@/app/design-system";
import { CustomerCreateForm } from "./CustomerCreateForm";

interface CustomerCreateWrapperProps {
  organizationSlug: string;
}

export function CustomerCreateWrapper({ organizationSlug }: CustomerCreateWrapperProps) {
  return (
    <VStack gap="6" alignItems="stretch" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <CustomerCreateForm organizationSlug={organizationSlug} />
    </VStack>
  );
} 
