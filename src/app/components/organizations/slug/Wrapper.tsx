"use client";

import {
  Container,
  VStack
} from "@/app/design-system";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import { Header } from "./Header";
import { Tabs } from "./Tabs";

export function Wrapper({ organization, members, activeTab }: { organization: Organization, members: User[], activeTab: string }) {
  return (
    <Container maxWidth="7xl" p="6" minH="100vh" h="100%">
      <VStack gap="6" alignItems="stretch" w="full" h="full">
        <Header organizationName={organization.name} />
        <Tabs members={members} organization={organization} activeTab={activeTab} />
      </VStack>
    </Container>
  );
}
