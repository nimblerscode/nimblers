import { Calendar, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Heading,
  HStack,
  Icon,
  List,
  ListItem,
  Pill,
  Text,
  VStack,
} from "@/app/design-system";

export function Subscription() {
  return (
    <Card>
      <VStack gap="4" alignItems="stretch" w="full">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <VStack gap="4" alignItems="stretch" w="full">
            <VStack
              borderWidth="1px"
              borderColor="border.default"
              bg="page.background"
              gap="3"
              alignItems="stretch"
              w="full"
              borderRadius="sm"
              p="4"
            >
              <HStack
                alignItems="center"
                justifyContent="space-between"
                gap="4"
              >
                <Heading as="h3" levelStyle="h3">
                  Current Plan
                </Heading>
                <Pill variant="success" size="md">
                  Active
                </Pill>
              </HStack>
              <HStack>
                <Heading as="h4" levelStyle="h2">
                  Free
                </Heading>
              </HStack>
              <HStack>
                <Icon color="colors.content.subtle" icon={Calendar} />
                <Text color="content.subtle">Next billing on Aug 14, 2023</Text>
              </HStack>
            </VStack>
            <VStack gap="2" alignItems="stretch" w="full">
              <Heading as="h3" levelStyle="h6">
                Plan Features
              </Heading>
              <List>
                <ListItem
                  iconAlignment="flex-start"
                  icon={
                    <Icon color="colors.status.success.icon" icon={Check} />
                  }
                >
                  <Text>Unlimited WhatsApp messages</Text>
                </ListItem>
                <ListItem
                  iconAlignment="flex-start"
                  icon={
                    <Icon color="colors.status.success.icon" icon={Check} />
                  }
                >
                  <Text>10 team members</Text>
                </ListItem>
                <ListItem
                  iconAlignment="flex-start"
                  icon={
                    <Icon color="colors.status.success.icon" icon={Check} />
                  }
                >
                  <Text>Advanced analytics and insights</Text>
                </ListItem>
              </List>
            </VStack>
          </VStack>
        </CardContent>
      </VStack>
    </Card>
  );
}
