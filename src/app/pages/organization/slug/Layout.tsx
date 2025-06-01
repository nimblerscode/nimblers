"use server";
import type { RequestInfo } from "rwsdk/worker";
import { getPendingInvitations } from "@/app/actions/invitations/list";
import { getMembers } from "@/app/actions/members/get";
import {
  getOrganization,
  getUserOrganizations,
} from "@/app/actions/organization/get";
import { getOrganizationConnectedStores } from "@/app/actions/organization/getStoreConnections";
import { getActiveOrganization } from "@/app/actions/organization/switch";
import { getShopifyConfig } from "@/app/actions/shopify/config";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Wrapper } from "../../../components/organizations/slug/Wrapper";

function parseOAuthMessage(searchParams: URLSearchParams) {
  if (searchParams.get("shopify_connected") === "true") {
    const connectedShop = searchParams.get("shop");
    return {
      type: "success" as const,
      message: `Successfully connected to ${connectedShop}!`,
    };
  }

  if (searchParams.get("shopify_error")) {
    const errorType = searchParams.get("shopify_error");
    const errorDetails = searchParams.get("error_details");
    return {
      type: "error" as const,
      message: `Failed to connect to Shopify: ${errorType}. ${errorDetails ? `Details: ${errorDetails}` : ""}`,
    };
  }

  return null;
}

export async function Layout({ params, ctx, request }: RequestInfo) {
  const { orgSlug } = params;
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

  // Get current path for sidebar active state
  const url = new URL(request.url);
  const currentPath = url.pathname;

  // Parse OAuth message from URL
  const oauthMessage = parseOAuthMessage(url.searchParams);

  // Parallel data fetching
  const [
    org,
    membersResult,
    organizations,
    activeOrganizationId,
    invitationsResult,
    shopifyConfig,
    connectedStoresResult,
  ] = await Promise.all([
    getOrganization(orgSlug),
    getMembers(orgSlug),
    getUserOrganizations(),
    getActiveOrganization(),
    getPendingInvitations(orgSlug),
    getShopifyConfig(),
    getOrganizationConnectedStores(orgSlug),
  ]);

  // Handle connected stores result and transform to match component interface
  const connectedStores = connectedStoresResult.success
    ? connectedStoresResult.data.map((store) => ({
        id: store.id,
        shopDomain: store.shopDomain as any, // Cast to ShopDomain branded type
        status: store.status,
        connectedAt: store.connectedAt,
        lastSyncAt: store.lastSyncAt,
      }))
    : []; // Gracefully handle errors by returning empty array

  return (
    <Wrapper
      organization={org}
      members={membersResult.members}
      user={user}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      pendingInvitations={invitationsResult.pendingInvitations}
      currentPath={currentPath}
      shopifyData={{
        clientId: shopifyConfig.clientId,
        connectedStores,
        oauthMessage,
      }}
    />
  );
}
