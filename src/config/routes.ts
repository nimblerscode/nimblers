import { prefix, render, route } from "rwsdk/router";
import { Layout as OrganizationSlugLayout } from "@/app/pages/organization/slug/Layout";
// import CreateOrganizationForm from "@/app/components/CreateOrganizationForm"; // No longer directly used here
import { Document } from "@/app/Document";
import SendInvitation from "@/app/pages/Home";
import InvitationsPage from "@/app/pages/InvitationsPage";
import { Layout as LoginLayout } from "@/app/pages/login/Layout";
import { Layout as OrganizationCreateLayout } from "@/app/pages/organization/create/Layout"; // Import the new wrapper page
import { Layout as SignUpLayout } from "@/app/pages/signup/Layout";
import { authResponse, sessionHandler } from "@/infrastructure/auth/middleware";

// Organization routes (if simple enough to keep here, otherwise import)
const orgSlugRoutes = [
  route("/:tab", [sessionHandler, OrganizationSlugLayout]),
];

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
    route("/invitations/create", [sessionHandler, SendInvitation]),
    route("/invitations/:token", InvitationsPage),
    route("/login", [LoginLayout]),
    route("/signup", [SignUpLayout]),
    // Add other UI routes within Document here if needed
    // route("/*", NotFoundPage), // Example: Needs NotFoundPage component
  ]),

  // Sign-in Route using the Use Case Effect
  route("/api/auth/*", [authResponse]),

  // Fallback for routes defined outside of render(Document, ...)
  // If you intend this only for API-like routes, adjust the path pattern
  route("/*", () => new Response("Not Found", { status: 404 })),
];
