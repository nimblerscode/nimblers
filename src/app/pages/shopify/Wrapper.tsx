"use client";

import { Banner } from "@/app/design-system/Banner";
import { Card } from "@/app/design-system/Card";
import { Heading } from "@/app/design-system/Heading";
import { VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { ShopifyConnectForm } from "./ShopifyConnectForm";
import { ShopifyConnectionStatus } from "./ShopifyConnectionStatus";

interface ShopifyConnection {
  connected: boolean;
  shop?: string;
  accessToken?: string;
  scope?: string;
  lastConnected?: string;
  error?: string;
  errorDetails?: string;
}

interface ShopifyWrapperProps {
  connection?: ShopifyConnection;
}

export function ShopifyWrapper({ connection }: ShopifyWrapperProps) {
  return (
    <VStack gap="6">
      <Heading as="h1">Shopify Integration</Heading>

      {connection?.error ? (
        <Card>
          <VStack gap="4">
            <Banner variant="error">
              <Text>❌ OAuth Error: {connection.error}</Text>
            </Banner>

            {connection.errorDetails && (
              <VStack gap="2">
                <Text>
                  <strong>Details:</strong> {connection.errorDetails}
                </Text>
              </VStack>
            )}

            {connection.shop && (
              <Text>
                <strong>Shop:</strong> {connection.shop}
              </Text>
            )}

            <Text>
              Please try connecting again or check your app configuration.
            </Text>

            {/* Show connect form to retry */}
            <ShopifyConnectForm />
          </VStack>
        </Card>
      ) : connection?.connected ? (
        <ShopifyConnectionStatus connection={connection} />
      ) : (
        <ShopifyConnectForm />
      )}

      <Card>
        <VStack gap="3">
          <Heading as="h2">OAuth Flow Information</Heading>
          <Text>The complete OAuth flow includes:</Text>
          <VStack gap="1">
            <Text>1. HMAC signature verification for security</Text>
            <Text>2. Nonce generation and validation (CSRF protection)</Text>
            <Text>3. Redirect to Shopify for authorization</Text>
            <Text>4. User approves the app permissions</Text>
            <Text>5. Shopify redirects back with authorization code</Text>
            <Text>6. HMAC verification of callback request</Text>
            <Text>7. Nonce verification and consumption</Text>
            <Text>8. Exchange authorization code for access token</Text>
            <Text>9. Secure storage of access token in Durable Object</Text>
          </VStack>
        </VStack>
      </Card>
    </VStack>
  );
}
