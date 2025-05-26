"use client";

import { Building2 } from "lucide-react";
import { Heading } from "@/app/design-system/Heading";
import { Icon } from "@/app/design-system/Icon";
import { VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";

interface EmptyOrganizationsStateProps {
  onOrganizationCreated?: () => void;
}

export function EmptyOrganizationsState({
  onOrganizationCreated,
}: EmptyOrganizationsStateProps) {
  return (
    <VStack gap="6" alignItems="center" py="12">
      <VStack gap="3" alignItems="center">
        <Icon icon={Building2} size={48} css={{ color: "content.subtle" }} />
        <Heading as="h3" levelStyle="h4">
          No organizations yet
        </Heading>
        <Text css={{ color: "content.subtle", textAlign: "center" }}>
          Create your first organization to start collaborating with your team.
        </Text>
      </VStack>

      <CreateOrganizationDialog onOrganizationCreated={onOrganizationCreated} />
    </VStack>
  );
}
