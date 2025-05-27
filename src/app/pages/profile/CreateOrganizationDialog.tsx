"use client";

import { Plus } from "lucide-react";
import { CreateOrganization } from "@/app/components/organizations/create/Create";
import { Button } from "@/app/design-system/Button";
import { Dialog } from "@/app/design-system/Dialog";
import { Icon } from "@/app/design-system/Icon";
import { HStack } from "@/app/design-system/Layout";

interface CreateOrganizationDialogProps {
  onOrganizationCreated?: () => void;
}

export function CreateOrganizationDialog({
  onOrganizationCreated,
}: CreateOrganizationDialogProps) {
  const trigger = (
    <Button>
      <HStack gap="2" alignItems="center">
        <Icon icon={Plus} size={16} />
        Create Organization
      </HStack>
    </Button>
  );

  return (
    <Dialog
      trigger={trigger}
      title="Create Organization"
      size="2xl"
      showCloseButton={true}
    >
      {(_close) => <CreateOrganization />}
    </Dialog>
  );
}
