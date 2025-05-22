import { CircleCheck } from "lucide-react";
import {
  Banner,
  Heading,
  Icon,
  List,
  ListItem,
  Text,
  VStack,
} from "@/app/design-system";

export function ProductValueHighlights() {
  return (
    <VStack alignItems="flex-start" gap="8">
      <Heading as="h1" levelStyle="h1">
        Nimblers
      </Heading>
      <Heading as="h2" fontSize="5xl">
        WhatsApp customer service,{" "}
        <Text as="span" color="content.secondary">
          simplified
        </Text>
      </Heading>
      <List>
        <VStack gap="8" alignItems="flex-start">
          <ListItem
            iconAlignment="flex-start"
            icon={
              <Icon color="colors.status.success.icon" icon={CircleCheck} />
            }
          >
            <Heading as="h3" levelStyle="h4">
              WhatsApp integration in minutes
            </Heading>
            <Text>
              Connect your WhatsApp Business account and start serving customers
              immediately.
            </Text>
          </ListItem>
          <ListItem
            iconAlignment="flex-start"
            icon={
              <Icon icon={CircleCheck} color="colors.status.success.icon" />
            }
          >
            <Heading as="h3" levelStyle="h4">
              WhatsApp integration in minutes
            </Heading>
            <Text>
              Connect your WhatsApp Business account and start serving customers
              immediately.
            </Text>
          </ListItem>
          <ListItem
            iconAlignment="flex-start"
            icon={
              <Icon icon={CircleCheck} color="colors.status.success.icon" />
            }
          >
            <Heading as="h3" levelStyle="h4">
              WhatsApp integration in minutes
            </Heading>
            <Text>
              Connect your WhatsApp Business account and start serving customers
              immediately.
            </Text>
          </ListItem>
        </VStack>
      </List>
      <Banner variant="info">
        <Text fontSize="sm" color="content.secondary">
          Did you know? Nimblers offers a free tier with up to 1,000 messages
          per month, even on paid plans.
        </Text>
      </Banner>
    </VStack>
  );
}
