"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Icon } from "@/app/design-system/Icon";
import { HStack, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";

export function ProfilePageClient() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <VStack gap="4" alignItems="stretch">
      {/* Account Settings Toggle */}
      <HStack
        alignItems="center"
        justifyContent="space-between"
        css={{
          cursor: "pointer",
          p: "2",
          borderRadius: "md",
          _hover: { bg: "bg.subtle" },
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <HStack gap="3" alignItems="center">
          <Icon icon={Settings} size={16} />
          <Text css={{ fontWeight: "medium" }}>Account Settings</Text>
        </HStack>
        <Text css={{ fontSize: "sm", color: "content.subtle" }}>
          {isExpanded ? "−" : "+"}
        </Text>
      </HStack>

      {/* Expandable Settings Content */}
      {isExpanded && (
        <VStack gap="2" css={{ pl: "6" }}>
          <Text
            css={{
              fontSize: "sm",
              color: "content.subtle",
              cursor: "pointer",
              _hover: { color: "content.base" },
            }}
          >
            Profile Settings
          </Text>
          <Text
            css={{
              fontSize: "sm",
              color: "content.subtle",
              cursor: "pointer",
              _hover: { color: "content.base" },
            }}
          >
            Security
          </Text>
          <Text
            css={{
              fontSize: "sm",
              color: "content.subtle",
              cursor: "pointer",
              _hover: { color: "content.base" },
            }}
          >
            Notifications
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
