"use client";
import { Building2, Calendar, Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HStack,
  Icon,
  Text,
  VStack,
} from "@/app/design-system";
import { DList } from "@/app/design-system/DefinitionList";
import type { Organization } from "@/domain/tenant/organization/model";

export function Overview({ organization }: { organization: Organization }) {
  return (
    <Card h="fit-content">
      <VStack gap="4" alignItems="stretch" w="full">
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <DList.Root>
            <DList.Term>Organization ID</DList.Term>
            <DList.Description>
              <HStack gap="2">
                <Icon
                  icon={Building2}
                  color="colors.content.subtle"
                  size={16}
                />
                <Text>{organization.id}</Text>
              </HStack>
            </DList.Description>

            <DList.Term>Created On</DList.Term>
            <DList.Description>
              <HStack gap="2">
                <Icon icon={Calendar} color="colors.content.subtle" size={16} />
                <Text>
                  {new Date(organization.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
            </DList.Description>

            {/* <DList.Term>Owner</DList.Term>
            <DList.Description>John Smith</DList.Description> */}

            <DList.Term>Public URL</DList.Term>
            <DList.Description>
              <HStack gap="2">
                <Icon icon={Globe} color="colors.content.subtle" size={16} />
                <Text>https://nimblers.co/{organization.slug}</Text>
              </HStack>
            </DList.Description>
          </DList.Root>
        </CardContent>
      </VStack>
    </Card>
  );
}
