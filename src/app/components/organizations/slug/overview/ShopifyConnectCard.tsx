import { ShopifyConnectCardClient } from "./ShopifyConnectCardClient";

interface ShopifyConnectCardProps {
  organizationSlug: string;
  shopifyData: {
    clientId: string;
    oauthMessage: {
      type: 'success' | 'error';
      message: string;
    } | null;
  };
  // Optional: if we know a specific shop domain to check
  shopDomain?: string;
}

export function ShopifyConnectCard({
  organizationSlug,
  shopifyData,
  shopDomain
}: ShopifyConnectCardProps) {
  // For now, we'll let the client component handle connection status checking
  // This prevents the async server component issues and excessive DO requests

  return (
    <ShopifyConnectCardClient
      organizationSlug={organizationSlug}
      shopifyClientId={shopifyData.clientId}
      initialConnectionStatus={null} // Let client component handle this
      oauthMessage={shopifyData.oauthMessage}
      knownShopDomain={shopDomain}
    />
  );
} 
