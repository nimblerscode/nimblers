"use client";

import { Card, CardContent } from "@/app/design-system/Card";
import { Box, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { User } from "@/domain/global/user/model";
import { ProfilePageClient } from "./ProfilePageClient";

interface UserInfoSidebarProps {
  user: User;
}

// Avatar component with initials
function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const displayName = name || email;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box
      css={{
        width: "16",
        height: "16",
        borderRadius: "full",
        bg: "accent.bg",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "lg",
        fontWeight: "semibold",
        color: "accent.text",
      }}
    >
      {initials}
    </Box>
  );
}

export function UserInfoSidebar({ user }: UserInfoSidebarProps) {
  return (
    <Box css={{ width: { lg: "xs" }, flexShrink: "0" }}>
      <Card>
        <CardContent>
          <VStack gap="6" alignItems="stretch">
            {/* User Avatar and Info */}
            <VStack gap="4" alignItems="center">
              <UserAvatar name={user.name} email={user.email} />
              <VStack gap="1" alignItems="center">
                <Text css={{ fontWeight: "medium", fontSize: "lg" }}>
                  {user.name || "User"}
                </Text>
                <Text css={{ fontSize: "sm", color: "content.subtle" }}>
                  {user.email}
                </Text>
              </VStack>
            </VStack>

            {/* Account Settings - Client Component */}
            <ProfilePageClient />
          </VStack>
        </CardContent>
      </Card>
    </Box>
  );
}

// Add default export
export default UserInfoSidebar;
