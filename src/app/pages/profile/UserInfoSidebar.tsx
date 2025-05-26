"use client";

import { Card, CardContent } from "@/app/design-system/Card";
import { Box, HStack, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { User } from "@/domain/global/user/model";
import { ProfilePageClient } from "./ProfilePageClient";
import { Avatar } from "@/app/design-system/Avatar";
import { Heading } from "@/app/design-system/Heading";

interface UserInfoSidebarProps {
  user: User;
}


export function UserInfoSidebar({ user }: UserInfoSidebarProps) {
  return (
    <Card>
      <CardContent>
        <VStack gap="6" alignItems="stretch">
          {/* User Avatar and Info */}
          <HStack gap="4" alignItems="center">
            {user.name ? <Avatar name={user.name} /> : <Avatar />}
            <VStack gap="0" alignItems="flex-start">
              <Heading as="h2" levelStyle="h3">
                {user.name || "User"}
              </Heading>
              <Text>{user.email}</Text>
            </VStack>
          </HStack>

          {/* Account Settings - Client Component */}
          <ProfilePageClient />
        </VStack>
      </CardContent>
    </Card>
  );
}

// Add default export
export default UserInfoSidebar;
