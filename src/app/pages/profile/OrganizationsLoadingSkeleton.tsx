"use client";

import { EntityList } from "@/app/design-system/EntityList";
import { VStack, Box } from "@/app/design-system/Layout";

export function OrganizationsLoadingSkeleton() {
  return (
    <EntityList>
      {["loading-1", "loading-2", "loading-3"].map((id) => (
        <EntityList.Item
          key={id}
          title=""
          avatarProps={{
            name: "Loading",
            colorScheme: "gray"
          }}
          extraInfo={
            <Box
              css={{
                width: "20",
                height: "3",
                bg: "gray.bg",
                borderRadius: "sm",
                animation: "pulse"
              }}
            />
          }
        >
          <VStack gap="2" alignItems="flex-start">
            <Box
              css={{
                width: "32",
                height: "4",
                bg: "gray.bg",
                borderRadius: "sm",
                animation: "pulse"
              }}
            />
            <Box
              css={{
                width: "20",
                height: "3",
                bg: "gray.bg",
                borderRadius: "sm",
                animation: "pulse"
              }}
            />
          </VStack>
        </EntityList.Item>
      ))}
    </EntityList>
  );
} 
