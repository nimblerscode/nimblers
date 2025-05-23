import {
  Breadcrumb,
  Breadcrumbs,
  ChevronRight,
  Heading,
  Icon,
  Link,
  VStack,
} from "@/app/design-system";

import type { Organization } from "@/domain/tenant/organization/model";

export function Header({
  organizationName,
}: {
  organizationName: Organization["name"];
}) {
  return (
    <VStack gap="2" alignItems="stretch" w="full">
      <Breadcrumbs>
        <Breadcrumb>
          <Link href="/" variants="breadcrumb">
            Home
          </Link>
        </Breadcrumb>
        <Breadcrumb>
          <Icon size="14" icon={ChevronRight} />
          <Link href="/category" variants="breadcrumb">
            Category
          </Link>
        </Breadcrumb>
        <Breadcrumb>
          <Icon size="14" icon={ChevronRight} />
          Current Page
        </Breadcrumb>
      </Breadcrumbs>
      <Heading as="h1" levelStyle="h1">
        {organizationName}
      </Heading>
    </VStack>
  );
}
