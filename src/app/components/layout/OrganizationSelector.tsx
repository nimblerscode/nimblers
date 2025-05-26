"use client";

import { useState, useTransition } from "react";
import type { Key } from "react-aria-components";
import type { getUserOrganizations } from "@/app/actions/organization/get";
import { switchActiveOrganization } from "@/app/actions/organization/switch";
import {
  HStack,
  Icon,
  Select,
  SelectHeader,
  SelectItem,
  Text,
  VStack,
} from "@/app/design-system";
import { Home } from "@/app/design-system/icons";

interface OrganizationSelectorProps {
  organizations: Awaited<ReturnType<typeof getUserOrganizations>>;
  activeOrganizationId?: string | null;
  currentPath?: string;
  onOrganizationChange?: (organizationId: string) => void;
}

export function OrganizationSelector({
  organizations,
  activeOrganizationId,
  currentPath = "",
  onOrganizationChange,
}: OrganizationSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSelectionChange = (selectedKey: Key | null) => {
    if (!selectedKey) return;

    const organizationId = String(selectedKey);

    if (organizationId === activeOrganizationId) {
      return; // No change needed
    }

    setError(null);

    startTransition(async () => {
      try {
        setError(null);

        // Switch the active organization
        const result = await switchActiveOrganization(organizationId);

        if (!result.success) {
          setError(result.error || "Failed to switch organization");
          return;
        }

        // Find the selected organization to get its slug
        const selectedOrg = organizations.find(
          (org) => org.id === organizationId,
        );

        if (selectedOrg) {
          // Determine where to navigate based on current path
          let targetPath = `/organization/${selectedOrg.slug}`;

          // If we're already in an organization context, try to maintain the same page
          if (
            currentPath.startsWith("/organization/") &&
            currentPath.includes("/")
          ) {
            const pathParts = currentPath.split("/");
            if (pathParts.length > 3) {
              // Keep the sub-path (e.g., /members, /settings)
              const subPath = pathParts.slice(3).join("/");
              targetPath = `/organization/${selectedOrg.slug}/${subPath}`;
            }
          }

          // Navigate to the target path
          window.location.href = targetPath;
        } else {
          // Fallback: just reload the page
          window.location.reload();
        }
      } catch (_error) {
        setError("Failed to switch organization");
      }
    });
  };

  if (organizations.length === 0) {
    return (
      <Text fontSize="sm" color="content.secondary">
        No organizations available
      </Text>
    );
  }

  const selectedKey = activeOrganizationId || organizations[0]?.id || "";

  return (
    <VStack gap="2" alignItems="stretch">
      <Select
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        isDisabled={isPending}
        variantSize="sm"
        aria-label="Select active organization"
        placeholder="Select organization"
      >
        <SelectHeader>Your Organizations</SelectHeader>
        {organizations.map((org) => (
          <SelectItem key={org.id} id={org.id} textValue={org.name || org.slug}>
            {(_renderProps) => (
              <HStack gap="3" alignItems="center" width="full">
                <Icon icon={Home} size={16} />
                <VStack gap="0" alignItems="start" flex="1">
                  <Text fontSize="sm" fontWeight="medium">
                    {org.name || org.slug}
                  </Text>
                  <Text fontSize="xs" color="content.secondary">
                    {org.role} • {org.slug}
                  </Text>
                </VStack>
                {org.id === activeOrganizationId && (
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="content.primary"
                    css={{
                      backgroundColor: "border.default",
                      px: "2",
                      py: "0.5",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border.strong",
                    }}
                  >
                    Current
                  </Text>
                )}
              </HStack>
            )}
          </SelectItem>
        ))}
      </Select>

      {error && (
        <Text fontSize="xs" color="status.danger.solid">
          {error}
        </Text>
      )}

      {isPending && (
        <Text fontSize="xs" color="content.secondary">
          Switching organization...
        </Text>
      )}
    </VStack>
  );
}
