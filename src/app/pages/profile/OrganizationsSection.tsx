"use client";

import { VStack } from "@/app/design-system/Layout";
import type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";
import { EmptyOrganizationsState } from "./EmptyOrganizationsState";
import { OrganizationsList } from "./OrganizationsList";

// Transform the backend data to match the UI interface
interface Organization {
  id: string;
  name: string;
  role: "Owner" | "Admin" | "Editor" | "Member";
  memberCount: number;
  slug: string;
}

interface OrganizationsSectionProps {
  organizations: OrganizationWithMembershipAndName[];
  onOrganizationCreated?: () => void;
}

function transformOrganization(
  org: OrganizationWithMembershipAndName,
): Organization {
  return {
    id: org.id,
    name: org.name,
    role: org.role as "Owner" | "Admin" | "Editor" | "Member",
    memberCount: 1, // TODO: Add member count to the query
    slug: org.slug,
  };
}

export function OrganizationsSection({
  organizations,
  onOrganizationCreated,
}: OrganizationsSectionProps) {
  const transformedOrganizations = organizations.map(transformOrganization);

  return (
    <VStack gap="6" alignItems="stretch" w="full">
      {transformedOrganizations.length > 0 ? (
        <OrganizationsList organizations={transformedOrganizations} />
      ) : (
        <EmptyOrganizationsState
          onOrganizationCreated={onOrganizationCreated}
        />
      )}
    </VStack>
  );
}
