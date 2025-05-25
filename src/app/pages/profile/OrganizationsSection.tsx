"use client";

import { VStack } from "@/app/design-system/Layout";
import { useEffect, useState } from "react";
import { EmptyOrganizationsState } from "./EmptyOrganizationsState";
import { OrganizationsList } from "./OrganizationsList";
import { OrganizationsLoadingSkeleton } from "./OrganizationsLoadingSkeleton";

// Mock data for organizations - in real app this would come from server
interface Organization {
  id: string;
  name: string;
  role: "Owner" | "Admin" | "Editor" | "Member";
  memberCount: number;
  slug: string;
}

interface OrganizationsSectionProps {
  initialOrganizations?: Organization[];
}

export function OrganizationsSection({
  initialOrganizations = [],
}: OrganizationsSectionProps) {
  const [organizations, setOrganizations] =
    useState<Organization[]>(initialOrganizations);
  const [isLoading, setIsLoading] = useState(initialOrganizations.length === 0);

  // Load organizations if not provided initially
  useEffect(() => {
    if (initialOrganizations.length === 0) {
      // Simulate API call - in real app this would be a proper API call
      setTimeout(() => {
        setOrganizations([
          {
            id: "1",
            name: "Acme Inc",
            role: "Owner",
            memberCount: 5,
            slug: "acme-inc",
          },
          {
            id: "2",
            name: "Tech Solutions",
            role: "Admin",
            memberCount: 12,
            slug: "tech-solutions",
          },
          {
            id: "3",
            name: "Marketing Team",
            role: "Member",
            memberCount: 8,
            slug: "marketing-team",
          },
        ]);
        setIsLoading(false);
      }, 1000);
    }
  }, [initialOrganizations.length]);

  return (
    <VStack gap="6" alignItems="stretch" w="full">
      {/* Organizations List */}
      {isLoading ? (
        <OrganizationsLoadingSkeleton />
      ) : organizations.length > 0 ? (
        <OrganizationsList organizations={organizations} />
      ) : (
        <EmptyOrganizationsState />
      )}
    </VStack>
  );
}
