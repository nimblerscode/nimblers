"use client";

import { useState } from "react";
import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import { Card } from "@/app/design-system/Card";
import { VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";

export function ShopifyConnectForm() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [shop, setShop] = useState("");

  const handleConnect = async () => {
    if (!shop.trim()) {
      alert("Please enter your shop domain");
      return;
    }

    setIsConnecting(true);

    try {
      // Create the install URL
      const installUrl = new URL(
        "/shopify/oauth/install",
        window.location.origin,
      );
      installUrl.searchParams.set(
        "shop",
        shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`,
      );

      // Redirect to the install endpoint
      window.location.href = installUrl.toString();
    } catch (error) {
      setIsConnecting(false);
      alert("Failed to connect to Shopify. Please try again.");
    }
  };

  return (
    <Card>
      <VStack gap="4">
        <Banner variant="info">
          <Text>Connect your Shopify store to get started</Text>
        </Banner>

        <VStack gap="3">
          <div>
            <Text>Shop Domain</Text>
            <input
              type="text"
              placeholder="your-shop-name (without .myshopify.com)"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            <Text>
              Enter just the shop name, e.g., "my-shop" for
              my-shop.myshopify.com
            </Text>
          </div>

          <Button
            onClick={handleConnect}
            isDisabled={isConnecting || !shop.trim()}
            style={{ width: "100%" }}
          >
            {isConnecting ? "Connecting..." : "Connect to Shopify"}
          </Button>
        </VStack>
      </VStack>
    </Card>
  );
}
