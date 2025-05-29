"use client";

import { useEffect, useState } from "react";
import { TextField } from "@/app/design-system";
import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/design-system/Card";
import { Icon } from "@/app/design-system/Icon";
import { Check, ExternalLink, ShoppingCart } from "@/app/design-system/icons";
import { HStack, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";

interface ShopifyConnectCardClientProps {
  organizationSlug: string;
  shopifyClientId: string;
  initialConnectionStatus?: {
    connected: boolean;
    shop?: string;
    error?: string;
  } | null;
  oauthMessage?: {
    type: "success" | "error";
    message: string;
  } | null;
  knownShopDomain?: string;
}

interface ConnectionStatus {
  connected: boolean;
  shop?: string;
  error?: string;
}

export function ShopifyConnectCardClient({
  organizationSlug,
  shopifyClientId,
  initialConnectionStatus,
  oauthMessage: initialOauthMessage,
  knownShopDomain,
}: ShopifyConnectCardClientProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [shop, setShop] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(initialConnectionStatus || null);
  const [oauthMessage, setOauthMessage] = useState(initialOauthMessage);

  // Check for URL parameters on mount (after OAuth redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectedShop = urlParams.get("shop");
    const wasConnected = urlParams.get("shopify_connected") === "true";

    if (connectedShop) {
      setShop(connectedShop);

      if (wasConnected) {
        // Automatically check connection status for the connected shop
        checkConnectionStatusForShop(connectedShop);
      }
    } else if (knownShopDomain) {
      // If we have a known shop domain from server, check its status
      setShop(knownShopDomain);
      checkConnectionStatusForShop(knownShopDomain);
    }
  }, [knownShopDomain]);

  const checkConnectionStatusForShop = async (shopDomain: string) => {
    try {
      const statusUrl = new URL("/shopify/status", window.location.origin);
      statusUrl.searchParams.set("shop", shopDomain);

      const response = await fetch(statusUrl.toString());
      const status = (await response.json()) as ConnectionStatus;
      setConnectionStatus(status);
    } catch (error) {
      setConnectionStatus({
        connected: false,
        error: "Failed to check connection status",
      });
    }
  };

  const handleConnect = async () => {
    if (!shop.trim()) {
      alert("Please enter your shop domain");
      return;
    }

    if (!shopifyClientId) {
      alert("Shopify configuration not loaded. Please try again.");
      return;
    }

    setIsConnecting(true);

    try {
      // Normalize shop domain
      const shopDomain = shop.includes(".myshopify.com")
        ? shop
        : `${shop}.myshopify.com`;

      // Build Shopify authorization URL
      const clientId = shopifyClientId;
      const scopes = "read_products,write_products";
      const redirectUri = `${window.location.origin}/shopify/oauth/callback`;
      const state = `${organizationSlug}_${Date.now()}`; // Include organization context in state

      const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);

      // Redirect to Shopify's authorization URL
      window.location.href = authUrl.toString();
    } catch (error) {
      setIsConnecting(false);
      alert("Failed to connect to Shopify. Please try again.");
    }
  };

  const checkConnectionStatus = async () => {
    if (!shop.trim()) return;
    const shopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;
    await checkConnectionStatusForShop(shopDomain);
  };

  const handleDisconnect = async () => {
    if (!connectionStatus?.shop) return;

    if (confirm("Are you sure you want to disconnect from Shopify?")) {
      try {
        const disconnectUrl = new URL(
          "/shopify/disconnect",
          window.location.origin,
        );
        disconnectUrl.searchParams.set("shop", connectionStatus.shop);

        await fetch(disconnectUrl.toString(), { method: "POST" });
        setConnectionStatus({ connected: false });
      } catch (error) {
        alert("Failed to disconnect. Please try again.");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <HStack gap="3" alignItems="center">
          <Icon icon={ShoppingCart} />
          <CardTitle>Shopify Store</CardTitle>
        </HStack>
      </CardHeader>

      <CardContent>
        <VStack gap="4" alignItems="stretch">
          {/* OAuth Success/Error Messages */}
          {oauthMessage && (
            <Banner
              variant={oauthMessage.type === "success" ? "success" : "error"}
            >
              <HStack
                gap="2"
                alignItems="center"
                justifyContent="space-between"
              >
                <Text>{oauthMessage.message}</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setOauthMessage(null)}
                >
                  ×
                </Button>
              </HStack>
            </Banner>
          )}

          {connectionStatus?.connected ? (
            // Connected state
            <VStack gap="3" alignItems="stretch">
              <Banner variant="success">
                <HStack gap="2" alignItems="center">
                  <Icon icon={Check} />
                  <Text>Connected to {connectionStatus.shop}</Text>
                </HStack>
              </Banner>

              <HStack gap="3">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    const shopifyAdminUrl = `https://${connectionStatus.shop}/admin`;
                    window.open(shopifyAdminUrl, "_blank");
                  }}
                >
                  <HStack gap="2" alignItems="center">
                    <Text>Visit Store</Text>
                    <Icon icon={ExternalLink} />
                  </HStack>
                </Button>

                <Button variant="outline" size="sm" onPress={handleDisconnect}>
                  Disconnect
                </Button>
              </HStack>
            </VStack>
          ) : (
            // Not connected state
            <VStack gap="4" alignItems="stretch">
              <Banner variant="info">
                <Text>
                  Connect your Shopify store to sync products and manage
                  inventory
                </Text>
              </Banner>

              <VStack gap="3" alignItems="stretch">
                <TextField
                  label="Shopify Store URL"
                  value={shop}
                  onChange={(e) => setShop(e)}
                  inputProps={{
                    placeholder:
                      "Enter your Shopify store URL without the .myshopify.com",
                  }}
                  description="Enter just the shop name, e.g., 'my-shop' for my-shop.myshopify.com"
                />

                <HStack gap="3" justifyContent="flex-end">
                  <Button
                    onPress={handleConnect}
                    isDisabled={
                      isConnecting || !shop.trim() || !shopifyClientId
                    }
                    size="sm"
                    variant="primary"
                  >
                    {isConnecting ? "Connecting..." : "Connect to Shopify"}
                  </Button>

                  <Button
                    onPress={checkConnectionStatus}
                    isDisabled={!shop.trim()}
                    size="sm"
                    variant="secondary"
                  >
                    Check Status
                  </Button>
                </HStack>
              </VStack>

              {connectionStatus?.error && (
                <Banner variant="error">
                  <Text>{connectionStatus.error}</Text>
                </Banner>
              )}
            </VStack>
          )}
        </VStack>
      </CardContent>
    </Card>
  );
}
