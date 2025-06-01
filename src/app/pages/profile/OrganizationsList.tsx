"use client";

import { EntityList, HStack, Text } from "@/app/design-system";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { OrganizationId } from "@/domain/shopify/store/models";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { OrganizationActions } from "./OrganizationActions";
import { getRoleColorScheme, RolePill } from "./RolePill";

interface Organization {
  id: OrganizationId;
  name: string;
  role: "Owner" | "Admin" | "Editor" | "Member";
  memberCount: number;
  slug: OrganizationSlug;
}

interface OrganizationsListProps {
  organizations: Organization[];
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  return (
    <EntityList
      title={`Your Organizations (${organizations.length})`}
      action={<CreateOrganizationDialog />}
    >
      {organizations.map((org) => (
        <EntityList.Item
          key={org.id}
          title={
            <HStack gap="2" alignItems="center">
              <Text css={{ fontWeight: "medium", fontSize: "md" }}>
                {org.name}
              </Text>
              <RolePill role={org.role} />
            </HStack>
          }
          subtitle={`${org.memberCount} members`}
          avatarProps={{
            name: org.name,
            colorScheme:
              getRoleColorScheme(org.role) === "brand"
                ? "brand"
                : getRoleColorScheme(org.role) === "info"
                  ? "gray"
                  : getRoleColorScheme(org.role) === "success"
                    ? "success"
                    : "warning",
          }}
          actions={<OrganizationActions organizationId={org.id} />}
        />
      ))}
    </EntityList>
  );
}
