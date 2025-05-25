"use client";

import { Card, CardContent } from "@/app/design-system/Card";
import { Icon } from "@/app/design-system/Icon";
import { VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { Building2 } from "lucide-react";
import { CreateOrganizationButton } from "./CreateOrganizationButton";

export function EmptyOrganizationsState() {
  return (
    <Card>
      <CardContent>
        <VStack gap="6" alignItems="center" css={{ py: "8" }}>
          <Icon icon={Building2} size={48} css={{ color: "content.subtle" }} />
          <VStack gap="2" alignItems="center">
            <Text css={{ fontWeight: "medium", fontSize: "lg" }}>
              No organizations yet
            </Text>
            <Text css={{ color: "content.subtle", textAlign: "center" }}>
              Create your first organization to start collaborating with your team.
            </Text>
          </VStack>
          <CreateOrganizationButton variant="primary" size="md" showIcon />
        </VStack>
      </CardContent>
    </Card>
  );
} 
