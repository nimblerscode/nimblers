"use client";

import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import { Card } from "@/app/design-system/Card";
import { HStack, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";

interface ShopifyConnection {
  connected: boolean;
  shop?: string;
  accessToken?: string;
  scope?: string;
  lastConnected?: string;
}

interface ShopifyConnectionStatusProps {
  connection: ShopifyConnection;
}

export function ShopifyConnectionStatus({
  connection,
}: ShopifyConnectionStatusProps) {
  const handleDisconnect = async () => {
    try {
      const response = await fetch("/shopify/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      alert("Failed to disconnect from Shopify. Please try again.");
    }
  };

  return (
    <Card>
      <VStack gap="4">
        <Banner variant="success">
          <Text>✅ Connected to Shopify!</Text>
        </Banner>

        <VStack gap="2">
          <Text>
            <strong>Shop:</strong> {connection.shop}
          </Text>
          <Text>
            <strong>Scope:</strong> {connection.scope}
          </Text>
          <Text>
            <strong>Connected:</strong> {connection.lastConnected}
          </Text>
        </VStack>

        <HStack gap="3">
          <Button variant="secondary" onClick={handleDisconnect}>
            Disconnect
          </Button>
          <Button
            onClick={() =>
              window.open(`https://${connection.shop}/admin`, "_blank")
            }
          >
            Open Shopify Admin
          </Button>
        </HStack>
      </VStack>
    </Card>
  );
}
