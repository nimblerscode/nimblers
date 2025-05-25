import { prefix, render, route } from "rwsdk/router";
import { Layout as OrganizationSlugLayout } from "@/app/pages/organization/slug/Layout";
// import CreateOrganizationForm from "@/app/components/CreateOrganizationForm"; // No longer directly used here
import { Document } from "@/app/Document";
import InvitationsPage from "@/app/pages/InvitationsPage";
import { Layout as LoginLayout } from "@/app/pages/login/Layout";
import { Layout as OrganizationCreateLayout } from "@/app/pages/organization/create/Layout"; // Import the new wrapper page
import { Layout as SignUpLayout } from "@/app/pages/signup/Layout";
import { Layout as ProfileLayout } from "@/app/pages/profile/Layout";
import { authResponse, sessionHandler } from "@/infrastructure/auth/middleware";
import AcceptInvitePage from "@/app/pages/invite/AcceptInvitePage";
import { acceptInvitationAction } from "@/app/actions/invitations/accept";
import type { RequestInfo } from "rwsdk/worker";

// Wrapper for the invitation accept API
const acceptInvitationRoute = async (requestInfo: RequestInfo) => {
  if (requestInfo.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  return acceptInvitationAction(requestInfo.request, requestInfo);
};

export const organizationRoutes = [
  route("/create", [sessionHandler, OrganizationCreateLayout]), // Use the wrapper page
  route("/:orgSlug", [sessionHandler, OrganizationSlugLayout]),
  route("/:orgSlug/:tab", [sessionHandler, OrganizationSlugLayout]),
];

// Combine all routes into a single array
export const allRoutes = [
  render(Document, [
    route("/", [SignUpLayout]),
    prefix("/organization", organizationRoutes),
    // route("/invitations/create", [sessionHandler, InvitationsPage]),
    route("/invitations/:token", InvitationsPage),
    route("/invite/:token", AcceptInvitePage), // New unauthenticated invite acceptance route
    route("/login", [LoginLayout]),
    route("/signup", [SignUpLayout]),
    route("/profile", [sessionHandler, ProfileLayout]), // Add profile route
    // Add other UI routes within Document here if needed
    // route("/*", NotFoundPage), // Example: Needs NotFoundPage component
  ]),

  // API Routes
  route("/api/auth/*", [authResponse]),
  route("/api/invitations/accept", [sessionHandler, acceptInvitationRoute]),

  // Fallback for routes defined outside of render(Document, ...)
  // If you intend this only for API-like routes, adjust the path pattern
  route("/*", () => new Response("Not Found", { status: 404 })),
];
