"use client";

import { Heading } from "@/app/design-system";
import { LoginForm } from "../../components/login/Form";
import { Container, VStack } from "../../design-system/Layout";
export function Layout() {
  return (
    <Container
      display="flex"
      maxW="md"
      mx="auto"
      alignItems="center"
      minH="100vh"
      justifyContent="center"
    >
      <VStack gap="8" alignItems="stretch" w="full">
        <Heading as="h1">Nimblers</Heading>
        <LoginForm />
      </VStack>
    </Container>
  );
}
