"use client";

import { Heading } from "@/app/design-system/Heading";
import { Container, Grid, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";
import { OrganizationsSection } from "./OrganizationsSection";
import UserInfoSidebar from "./UserInfoSidebar";
import type { User } from "@/domain/global/user/model";

interface ProfilePageProps {
  user: User;
  organizations: OrganizationWithMembershipAndName[];
}

export function ProfilePage({ user, organizations }: ProfilePageProps) {
  return (
    <Container maxW="8xl" py="8" minH="100vh">
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
        <Grid
          gridTemplateColumns={{ base: "1fr", md: "1fr 3fr" }}
          gap="8"
          alignItems="start"
        >
          {/* Left Sidebar - User Info */}
          <UserInfoSidebar user={user} />

          {/* Right Content - Organizations */}
          <OrganizationsSection organizations={organizations} />
        </Grid>
      </VStack>
    </Container>
  );
}

export default ProfilePage;
