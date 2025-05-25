"use client";

import { Button } from "@/app/design-system/Button";
import { Icon } from "@/app/design-system/Icon";
import { HStack } from "@/app/design-system/Layout";
import { Star, Settings, MoreHorizontal } from "lucide-react";

interface OrganizationActionsProps {
  organizationId: string;
  isStarred?: boolean;
}

export function OrganizationActions({
  organizationId,
  isStarred = false
}: OrganizationActionsProps) {
  const handleStar = () => {
    console.log(`Toggle star for organization ${organizationId}`);
  };

  const handleSettings = () => {
    console.log(`Open settings for organization ${organizationId}`);
  };

  const handleMore = () => {
    console.log(`Open more options for organization ${organizationId}`);
  };

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
