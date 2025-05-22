"use client";
import { CreateOrganization } from "@/app/components/organizations/create/Create";
import { Container, Heading, VStack } from "@/app/design-system";

export default function Layout() {
  return (
    <Container
      display="flex"
      maxW="3xl"
      mx="auto"
      alignItems="center"
      minH="100vh"
      justifyContent="center"
    >
      <VStack gap="8" alignItems="stretch" w="full">
        <Heading as="h1">Nimblers</Heading>
        <CreateOrganization />
      </VStack>
    </Container>
  );
}
