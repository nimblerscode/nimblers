"use client";

import { Avatar } from "@/app/design-system/Avatar";
import { Card, CardContent } from "@/app/design-system/Card";
import { Heading } from "@/app/design-system/Heading";
import { HStack, VStack } from "@/app/design-system/Layout";
import { Pill } from "@/app/design-system/Pill";
import { Text } from "@/app/design-system/Text";
import type { User } from "@/domain/global/user/model";

interface UserInfoSidebarProps {
  user: User;
}

export function UserInfoSidebar({ user }: UserInfoSidebarProps) {
  return (
    <Card>
      <CardContent>
        {/* User Avatar and Info */}
        <HStack gap="4" alignItems="center">
          {user.name ? <Avatar name={user.name} /> : <Avatar />}
          <VStack gap="0" alignItems="flex-start">
            <HStack gap="2" alignItems="center">
              <Heading as="h2" levelStyle="h3">
                {user.name || "User"}
              </Heading>
              {user.emailVerified ? (
                <Pill variant="success" size="sm">
                  Verified
                </Pill>
              ) : (
                <Pill variant="warning" size="sm">
                  Unverified
                </Pill>
              )}
            </HStack>
            <Text>{user.email}</Text>
          </VStack>
        </HStack>
      </CardContent>
    </Card>
  );
}

// Add default export
export default UserInfoSidebar;
