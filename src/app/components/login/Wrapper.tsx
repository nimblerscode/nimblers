"use client";

import { Heading } from "@/app/design-system";
import { LoginForm } from "../../components/login/Form";
import { Container, VStack } from "../../design-system/Layout";

export function LoginWrapper({
  token,
  redirect,
  email,
}: {
  token: string | null;
  redirect: string | null;
  email: string | null;
}) {
  return (
    <Container
      display="flex"
      maxW="xl"
      mx="auto"
      alignItems="center"
      minH="100vh"
      justifyContent="center"
    >
      <VStack gap="8" alignItems="stretch" w="full">
        <Heading as="h1">Nimblers</Heading>
        <LoginForm token={token} redirect={redirect} email={email} />
      </VStack>
    </Container>
  );
}
