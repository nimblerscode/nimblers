"use client";

import { MoreHorizontal, Settings, Star } from "lucide-react";
import { Button } from "@/app/design-system/Button";
import { Icon } from "@/app/design-system/Icon";
import { HStack } from "@/app/design-system/Layout";
import type { OrganizationId } from "@/domain/shopify/store/models";

interface OrganizationActionsProps {
  organizationId: OrganizationId;
  isStarred?: boolean;
}

export function OrganizationActions({
  organizationId,
  isStarred = false,
}: OrganizationActionsProps) {
  const handleStar = () => {};

  const handleSettings = () => {};

  const handleMore = () => {};

  return (
    <HStack gap="0.5">
      <Button variant="ghost" size="sm" onPress={handleStar}>
        <Icon icon={Star} size={16} />
      </Button>
      <Button variant="ghost" size="sm" onPress={handleSettings}>
        <Icon icon={Settings} size={16} />
      </Button>
      <Button variant="ghost" size="sm" onPress={handleMore}>
        <Icon icon={MoreHorizontal} size={16} />
      </Button>
    </HStack>
  );
}
