"use client";

import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  Breadcrumbs,
  Container,
  Grid,
  Heading,
  Icon,
  Link,
  TTabs,
  VStack,
} from "@/app/design-system";
import { Overview } from "./Overview";
import { Subscription } from "./Subscription";

export function Layout() {
  return (
    <Container maxWidth="7xl" p="6" minH="100vh" h="100%">
      <VStack gap="2" alignItems="stretch" w="full">
        <Breadcrumbs>
          <Breadcrumb>
            <Link href="/" variants="breadcrumb">
              Home
            </Link>
          </Breadcrumb>
          <Breadcrumb>
            <Icon size="14" icon={ChevronRight} />
            <Link href="/category" variants="breadcrumb">
              Category
            </Link>
          </Breadcrumb>
          <Breadcrumb>
            <Icon size="14" icon={ChevronRight} />
            Current Page
          </Breadcrumb>
        </Breadcrumbs>
        <VStack gap="6" alignItems="stretch" w="full" h="full">
          <Heading as="h1" levelStyle="h1">
            Orgname
          </Heading>
          <TTabs.Root>
            <TTabs.List aria-label="Navigation">
              <TTabs.Tab id="tab1">Overview</TTabs.Tab>
              <TTabs.Tab id="tab2">Members</TTabs.Tab>
            </TTabs.List>
            <TTabs.Panel id="tab1">
              <Grid
                gridTemplateColumns={{ base: "1fr", md: "2fr 1fr" }}
                gap="6"
              >
                <Overview />
                <Subscription />
              </Grid>
            </TTabs.Panel>
            <TTabs.Panel id="tab2">
              <Subscription />
            </TTabs.Panel>
          </TTabs.Root>
        </VStack>
      </VStack>
    </Container>
  );
}
