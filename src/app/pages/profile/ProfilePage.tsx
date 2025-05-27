"use client";

import { EmailVerificationBanner } from "@/app/components/profile/EmailVerificationBanner";
import { OrganizationSelectorCard } from "@/app/components/profile/OrganizationSelectorCard";
import { ThemeSwitcherCard } from "@/app/components/profile/ThemeSwitcherCard";
import { Heading } from "@/app/design-system/Heading";
import { Container, Grid, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";
import type { User } from "@/domain/global/user/model";
import { OrganizationsSection } from "./OrganizationsSection";
import UserInfoSidebar from "./UserInfoSidebar";

interface ProfilePageProps {
  user: User;
  organizations: OrganizationWithMembershipAndName[];
  activeOrganizationId?: string | null;
  currentPath?: string;
}

export function ProfilePage({
  user,
  organizations,
  activeOrganizationId,
  currentPath,
}: ProfilePageProps) {
  return (
    <Container maxW="8xl" py="8" minH="100vh">
      <VStack gap="8" alignItems="stretch">
        {/* Email Verification Banner */}
        {!user.emailVerified && (
          <EmailVerificationBanner userEmail={user.email} />
        )}

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
          {/* Left Sidebar - User Info and Settings */}
          <VStack gap="6" alignItems="stretch">
            <UserInfoSidebar user={user} />
            <OrganizationSelectorCard
              organizations={organizations}
              activeOrganizationId={activeOrganizationId}
              currentPath={currentPath}
            />
            <ThemeSwitcherCard />
          </VStack>

          {/* Right Content - Organizations */}
          <OrganizationsSection organizations={organizations} />
        </Grid>
      </VStack>
    </Container>
  );
}

export default ProfilePage;
