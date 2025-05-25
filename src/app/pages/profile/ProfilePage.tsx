"use client";

import { Heading } from "@/app/design-system/Heading";
import { VStack, Flex, Container } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import UserInfoSidebar from "./UserInfoSidebar";
import { OrganizationsSection } from "./OrganizationsSection";
import type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";

interface User {
  id: any;
  email: any;
  name: string | null;
  image: string | null;
  role: null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfilePageProps {
  user: User;
  organizations: OrganizationWithMembershipAndName[];
}

export function ProfilePage({ user, organizations }: ProfilePageProps) {
  return (
    <Container maxW="6xl" py="8" minH="100vh">
      <VStack gap="8" alignItems="stretch">
        {/* Header */}
        <VStack gap="2" alignItems="flex-start">
          <Heading as="h1" levelStyle="h2">
            Your Profile
          </Heading>
          <Text css={{ color: "content.subtle" }}>
            Manage your account and organization settings
          </Text>
        </VStack>

        {/* Main Content */}
        <Flex gap="8">
          {/* Left Sidebar - User Info */}
          <UserInfoSidebar user={user} />

          {/* Right Content - Organizations */}
          <OrganizationsSection organizations={organizations} />
        </Flex>
      </VStack>
    </Container>
  );
}

export default ProfilePage; 
