"use server";

export interface ShopifyConnectionStatus {
  connected: boolean;
  shopDomain?: string;
  lastChecked: Date;
  error?: string;
}

export async function getShopifyConnectionStatus(
  organizationSlug: string,
  shopDomain?: string,
): Promise<ShopifyConnectionStatus> {
  // Simplified approach - just return basic status without DO calls
  // This prevents the excessive requests issue while we implement database-based tracking

  if (!shopDomain) {
    return {
      connected: false,
      lastChecked: new Date(),
      error: "No shop domain provided",
    };
  }

  // For now, return a basic response to prevent excessive DO requests
  // TODO: Implement proper database-based connection tracking
  return {
    connected: false,
    shopDomain,
    lastChecked: new Date(),
  };
}
