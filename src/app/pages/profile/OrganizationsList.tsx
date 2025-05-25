"use client";

import { Text, HStack, EntityList, Button } from "@/app/design-system";
import { OrganizationActions } from "./OrganizationActions";
import { getRoleColorScheme, RolePill } from "./RolePill";

interface Organization {
  id: string;
  name: string;
  role: "Owner" | "Admin" | "Editor" | "Member";
  memberCount: number;
  slug: string;
}

interface OrganizationsListProps {
  organizations: Organization[];
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  return (
    <EntityList
      title={`Your Organizations (${organizations.length})`}
      action={
        <Button variant="outline" size="sm">
          Add Organization
        </Button>
      }
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
