import { prefix, render, route } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";
import { acceptInvitationAction } from "@/app/actions/invitations/accept";
import { getOrganizationConnectedStores } from "@/app/actions/organization/getStoreConnections";
import { handleShopifyComplianceWebhook } from "@/app/actions/shopify/compliance";
import { handleTwilioWebhook } from "@/app/actions/messaging/twilio-webhook";
// import CreateOrganizationForm from "@/app/components/CreateOrganizationForm"; // No longer directly used here
import { Document } from "@/app/Document";
import InvitationsPage from "@/app/pages/InvitationsPage";
import AcceptInvitePage from "@/app/pages/invite/AcceptInvitePage";
import { Layout as LoginLayout } from "@/app/pages/login/Layout";
import { Layout as OrganizationCreateLayout } from "@/app/pages/organization/create/Layout"; // Import the new wrapper page
import { Layout as OrganizationSlugLayout } from "@/app/pages/organization/slug/Layout";
import { Layout as ProfileLayout } from "@/app/pages/profile/Layout";
import { routes as shopifyOAuthRoutes } from "@/app/pages/shopify/routes";
import { routes as campaignRoutes } from "@/app/pages/organization/slug/campaigns/routes";
import { Layout as SignUpLayout } from "@/app/pages/signup/Layout";
import {
  authResponse,
  optionalSessionHandler,
  redirectAuthenticatedUsers,
  sessionHandler,
} from "@/infrastructure/auth/middleware";

// Shopify compliance webhook handlers
const handleCustomerDataRequest = async ({ request }: RequestInfo) => {
  return handleShopifyComplianceWebhook("customers-data-request", request);
};

const handleCustomerDataErasure = async ({ request }: RequestInfo) => {
  return handleShopifyComplianceWebhook("customers-data-erasure", request);
};

const handleShopDataErasure = async ({ request }: RequestInfo) => {
  return handleShopifyComplianceWebhook("shop-data-erasure", request);
};

// Wrapper for the invitation accept API
const acceptInvitationRoute = async (requestInfo: RequestInfo) => {
  if (requestInfo.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const result = await acceptInvitationAction(
      requestInfo.request,
      requestInfo
    );
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to accept invitation",
      },
      { status: 400 }
    );
  }
};

// Organization stores API handler
const getOrganizationStoresRoute = async (requestInfo: RequestInfo) => {
  if (requestInfo.request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const orgSlug = requestInfo.params.orgSlug;
    if (!orgSlug) {
      return Response.json(
        { error: "Organization slug is required" },
        { status: 400 }
      );
    }

    const stores = await getOrganizationConnectedStores(orgSlug);
    return Response.json(stores, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to fetch stores",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

export const organizationRoutes = [
  route("/create", [sessionHandler, OrganizationCreateLayout]), // Use the wrapper page
  ...prefix("/:orgSlug/campaigns", campaignRoutes), // More specific routes first
  route("/:orgSlug", [sessionHandler, OrganizationSlugLayout]), // General route last
];

// Twilio webhook handler wrapper
const handleTwilioWebhookRoute = async (requestInfo: RequestInfo) => {
  return handleTwilioWebhook(requestInfo.request);
};

// Combine all routes into a single array
export const allRoutes = [
  render(Document, [
    route("/", [redirectAuthenticatedUsers, SignUpLayout]),
    prefix("/organization", organizationRoutes),
    // route("/invitations/create", [sessionHandler, InvitationsPage]),
    route("/invitations/:token", [InvitationsPage]),
    route("/invite/:token", [optionalSessionHandler, AcceptInvitePage]), // Use optional session handler for invitation acceptance
    route("/login", [redirectAuthenticatedUsers, LoginLayout]),
    route("/signup", [redirectAuthenticatedUsers, SignUpLayout]),
    route("/profile", [sessionHandler, ProfileLayout]), // Add profile route
    // Add other UI routes within Document here if needed
    // route("/*", NotFoundPage), // Example: Needs NotFoundPage component
  ]),

  // API Routes
  route("/api/auth/*", [authResponse]),
  route("/api/invitations/accept", [
    optionalSessionHandler,
    acceptInvitationRoute,
  ]),
  route("/api/organization/:orgSlug/stores", [
    sessionHandler,
    getOrganizationStoresRoute,
  ]),

  // Twilio Webhook
  route("/api/webhooks/twilio", handleTwilioWebhookRoute),

  // Shopify Compliance Webhooks
  route("/shopify/privacy/customers-data-request", handleCustomerDataRequest),
  route("/shopify/privacy/customers-data-erasure", handleCustomerDataErasure),
  route("/shopify/privacy/shop-data-erasure", handleShopDataErasure),

  // Shopify OAuth Routes
  prefix("/shopify", shopifyOAuthRoutes),

  // Fallback for routes defined outside of render(Document, ...)
  // If you intend this only for API-like routes, adjust the path pattern
  route("/*", () => new Response("Not Found", { status: 404 })),
];
