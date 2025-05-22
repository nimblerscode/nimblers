"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  VStack,
} from "@/app/design-system";
import { DList } from "@/app/design-system/DefinitionList";

export function Overview() {
  return (
    <Card>
      <VStack gap="4" alignItems="stretch" w="full">
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <DList.Root>
            <DList.Term>Organization ID</DList.Term>
            <DList.Description>org_[slug]</DList.Description>

            <DList.Term>Created On</DList.Term>
            <DList.Description>Jun 15, 2023</DList.Description>

            <DList.Term>Owner</DList.Term>
            <DList.Description>John Smith</DList.Description>

            <DList.Term>Public URL</DList.Term>
            <DList.Description>nimblers.com/[slug]</DList.Description>
          </DList.Root>
        </CardContent>
      </VStack>
    </Card>
  );
}
