"use client";

import type { getUserOrganizations } from "@/app/actions/organization/get";
import { Card, CardContent, CardTitle } from "@/app/design-system/Card";
import { VStack } from "@/app/design-system/Layout";
import { OrganizationSelector } from "../layout/OrganizationSelector";

interface OrganizationSelectorCardProps {
  organizations: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  currentPath?: string;
}

export function OrganizationSelectorCard({
  organizations,
  activeOrganizationId,
  currentPath,
}: OrganizationSelectorCardProps) {
  return (
    <Card>
      <CardContent>
        <VStack gap="4" alignItems="stretch">
          <CardTitle>Pick Organization</CardTitle>
          <OrganizationSelector
            organizations={organizations}
            activeOrganizationId={activeOrganizationId}
            currentPath={currentPath}
          />
        </VStack>
      </CardContent>
    </Card>
  );
}
