"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, TextField, Banner, Text, Icon, HStack, VStack } from "@/app/design-system";
import { Check, ExternalLink, ShoppingCart } from "@/app/design-system/icons";
import type { OrganizationSlug } from "@/domain/global/organization/models";

interface ConnectedStore {
  id: string;
  shopDomain: string;
  status: "active" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt: string | null;
}

interface ShopifyConnectCardClientProps {
  organizationSlug: OrganizationSlug;
  shopifyClientId: string;
  connectedStores: ConnectedStore[];
  hasActiveConnection: boolean;
  primaryStore?: ConnectedStore;
  oauthMessage?: {
    type: "success" | "error";
    message: string;
  } | null;
}

export function ShopifyConnectCardClient({
  organizationSlug,
  shopifyClientId,
  connectedStores,
  hasActiveConnection,
  primaryStore,
  oauthMessage,
}: ShopifyConnectCardClientProps) {
  const [shopDomain, setShopDomain] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  console.log("connectedStores", connectedStores);

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      setErrorMessage("Please enter your shop domain");
      return;
    }

    if (!shopifyClientId) {
      setErrorMessage("Shopify configuration not loaded. Please try again.");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Normalize shop domain
      const normalizedShop = shopDomain.includes(".myshopify.com")
        ? shopDomain
        : shopDomain + ".myshopify.com";

      // Build proper Shopify app installation URL
      // This should redirect to Shopify's OAuth flow
      const shopifyInstallUrl = new URL("https://" + normalizedShop + "/admin/oauth/authorize");
      shopifyInstallUrl.searchParams.set("client_id", shopifyClientId);
      shopifyInstallUrl.searchParams.set("scope", "read_products,write_products");
      shopifyInstallUrl.searchParams.set("redirect_uri", window.location.origin + "/shopify/oauth/callback");
      shopifyInstallUrl.searchParams.set("state", organizationSlug + "_org_" + Date.now());

      // Redirect to Shopify's OAuth authorization page
      window.location.href = shopifyInstallUrl.toString();
    } catch (error) {
      setErrorMessage("Failed to start connection process. Please try again.");
      setIsConnecting(false);
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
            <Banner variant={oauthMessage.type === "success" ? "success" : "error"}>
              {oauthMessage.message}
            </Banner>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Banner variant="error">
              {errorMessage}
            </Banner>
          )}

          {hasActiveConnection && primaryStore ? (
            // Connected State
            <VStack gap="3" alignItems="stretch">
              <Banner variant="success">
                <HStack gap="2" alignItems="center">
                  <Icon icon={Check} />
                  <Text>Connected to {primaryStore.shopDomain}</Text>
                </HStack>
              </Banner>

              <div style={{
                padding: "1rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb"
              }}>
                <VStack gap="2" alignItems="stretch">
                  <Text style={{ fontSize: "0.875rem", fontWeight: "500" }}>Store Details</Text>
                  <Text style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Connected: {new Date(primaryStore.connectedAt).toLocaleDateString()}
                  </Text>
                  {primaryStore.lastSyncAt && (
                    <Text style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Last sync: {new Date(primaryStore.lastSyncAt).toLocaleDateString()}
                    </Text>
                  )}
                </VStack>
              </div>

              <HStack gap="3" justifyContent="flex-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    const shopifyAdminUrl = `https://${primaryStore.shopDomain}/admin`;
                    window.open(shopifyAdminUrl, "_blank");
                  }}
                >
                  <HStack gap="2" alignItems="center">
                    <Text>Visit Store</Text>
                    <Icon icon={ExternalLink} />
                  </HStack>
                </Button>
              </HStack>
            </VStack>
          ) : (
            // Not Connected State
            <VStack gap="4" alignItems="stretch">
              <Banner variant="info">
                <Text>
                  Connect your Shopify store to sync products and manage inventory
                </Text>
              </Banner>

              <VStack gap="3" alignItems="stretch">
                <TextField
                  label="Shopify Store URL"
                  value={shopDomain}
                  onChange={setShopDomain}
                  inputProps={{
                    placeholder: "my-shop",
                  }}
                  description="Enter just the shop name, e.g., 'my-shop' for my-shop.myshopify.com"
                />

                <HStack gap="3" justifyContent="flex-end">
                  <Button
                    onPress={handleConnect}
                    isDisabled={isConnecting || !shopDomain.trim() || !shopifyClientId}
                    size="sm"
                    variant="primary"
                  >
                    {isConnecting ? "Connecting..." : "Connect to Shopify"}
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          )}

          {/* Show All Connected Stores */}
          {connectedStores.length > 1 && (
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
              <Text style={{ fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                All Connected Stores
              </Text>
              <VStack gap="2" alignItems="stretch">
                {connectedStores.map((store) => (
                  <div
                    key={store.id}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: store.status === "active" ? "#f0fdf4" : "#f9fafb",
                      borderRadius: "0.375rem",
                      border: "1px solid",
                      borderColor: store.status === "active" ? "#bbf7d0" : "#e5e7eb"
                    }}
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack gap="1" alignItems="flex-start">
                        <Text style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                          {store.shopDomain}
                        </Text>
                        <Text style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Status: {store.status} • Connected: {new Date(store.connectedAt).toLocaleDateString()}
                        </Text>
                      </VStack>
                      {store.status === "active" && <Icon icon={Check} />}
                    </HStack>
                  </div>
                ))}
              </VStack>
            </div>
          )}
        </VStack>
      </CardContent>
    </Card>
  );
}
