"use server";
import type { RequestInfo } from "rwsdk/worker";
import { getPendingInvitations } from "@/app/actions/invitations/list";
import { getMembers } from "@/app/actions/members/get";
import {
  getOrganization,
  getUserOrganizations,
} from "@/app/actions/organization/get";
import { getActiveOrganization } from "@/app/actions/organization/switch";
import { getShopifyConfig } from "@/app/actions/shopify/config";
import { getOrganizationStoreConnections } from "@/app/actions/organization/getStoreConnections";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Wrapper } from "../../../components/organizations/slug/Wrapper";

function parseOAuthMessage(searchParams: URLSearchParams) {
  if (searchParams.get("shopify_connected") === "true") {
    const connectedShop = searchParams.get("shop");
    return {
      type: 'success' as const,
      message: `Successfully connected to ${connectedShop}!`
    };
  }

  if (searchParams.get("shopify_error")) {
    const errorType = searchParams.get("shopify_error");
    const errorDetails = searchParams.get("error_details");
    return {
      type: 'error' as const,
      message: `Failed to connect to Shopify: ${errorType}. ${errorDetails ? `Details: ${errorDetails}` : ''}`
    };
  }

  return null;
}

export async function Layout({ params, ctx, request }: RequestInfo) {
  const org = await getOrganization(params.orgSlug);
  const { members } = await getMembers(params.orgSlug);
  const { pendingInvitations } = await getPendingInvitations(params.orgSlug);
  const appCtx = ctx as AppContext;

  if (!appCtx.user) {
    throw new Error("User not found in context");
  }

  const user = {
    ...appCtx.user,
    id: appCtx.user.id as any,
    email: appCtx.user.email as any,
    name: appCtx.user.name || null,
    image: appCtx.user.image || null,
    role: null,
  };

  // Fetch organizations data and active organization
  let organizations: Awaited<ReturnType<typeof getUserOrganizations>>;
  let activeOrganizationId: string | null;

  try {
    [organizations, activeOrganizationId] = await Promise.all([
      getUserOrganizations(),
      getActiveOrganization(),
    ]);
  } catch (_error) {
    organizations = [];
    activeOrganizationId = null;
  }

  // Get current path for sidebar active state
  const url = new URL(request.url);
  const currentPath = url.pathname;

  // Process Shopify OAuth data server-side
  const shopifyConfig = await getShopifyConfig();
  const oauthMessage = parseOAuthMessage(url.searchParams);

  // Check for connected shops
  let connectionStatus: { connected: boolean; shop?: string } | null = null;
  const connectedShop = url.searchParams.get("shop");
  if (connectedShop) {
    // If there's a shop parameter (from OAuth callback), check its connection status
    const storeConnections = await getOrganizationStoreConnections(
      params.orgSlug,
      connectedShop
    );

    // For the UI, we'll show connection status if we have one
    connectionStatus = storeConnections.length > 0 ? {
      connected: storeConnections[0].connected,
      shop: storeConnections[0].shop,
    } : null;
  }

  // For development: if no shop parameter but we want to check a known shop
  const defaultShopToCheck = connectedShop || "nimblers-dev.myshopify.com";

  return (
    <Wrapper
      organization={org}
      members={members}
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={pendingInvitations}
      currentPath={currentPath}
      shopifyData={{
        clientId: shopifyConfig.clientId,
        oauthMessage,
        connectedShop: defaultShopToCheck,
      }}
    />
  );
}
