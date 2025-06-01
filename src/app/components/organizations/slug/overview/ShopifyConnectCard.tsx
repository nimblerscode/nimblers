import type { OrganizationSlug, ShopDomain } from "@/domain/global/organization/models";
import { ShopifyConnectCardClient } from "./ShopifyConnectCardClient";

interface ConnectedStore {
  id: string;
  shopDomain: ShopDomain;
  status: "active" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt: string | null;
}

interface ShopifyConnectCardProps {
  organizationSlug: OrganizationSlug;
  shopifyClientId: string;
  connectedStores: ConnectedStore[];
  oauthMessage?: {
    type: "success" | "error";
    message: string;
  } | null;
}

export function ShopifyConnectCard({
  organizationSlug,
  shopifyClientId,
  connectedStores,
  oauthMessage,
}: ShopifyConnectCardProps) {
  // Find active stores
  const activeStores = connectedStores.filter((store) => store.status === "active");
  const hasActiveConnection = activeStores.length > 0;
  const primaryStore = activeStores[0];

  return (
    <ShopifyConnectCardClient
      organizationSlug={organizationSlug}
      shopifyClientId={shopifyClientId}
      connectedStores={connectedStores}
      hasActiveConnection={hasActiveConnection}
      primaryStore={primaryStore}
      oauthMessage={oauthMessage}
    />
  );
}
