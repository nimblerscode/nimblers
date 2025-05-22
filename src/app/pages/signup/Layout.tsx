"use client";
import { SignUpForm } from "@/app/components/signUp/Form";
import { ProductValueHighlights } from "@/app/components/signUp/ProductValueHighlights";
import { Container, Grid } from "@/app/design-system/Layout";

export function Layout() {
  return (
    <Container
      maxW="6xl"
      mx="auto"
      display="flex"
      alignItems="center"
      minH="100vh"
    >
      <Grid gap="12" columns={{ base: 1, md: 2 }}>
        <ProductValueHighlights />
        <SignUpForm />
      </Grid>
    </Container>
  );
}
