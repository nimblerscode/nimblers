import CreateOrganizationForm from "@/app/components/CreateOrganizationForm";
import { Document } from "@/app/Document";
import SendInvitation from "@/app/pages/Home";
import Login from "@/app/pages/Login";
import { prefix, render, route } from "@redwoodjs/sdk/router";

import ManageOrganization from "@/app/pages/ManageOrganization";
import SignUp from "@/app/pages/SignUp";
import InvitationsPage from "@/app/pages/InvitationsPage";
import { authResponse, sessionHandler } from "@/infrastructure/auth/middleware";

// Organization routes (if simple enough to keep here, otherwise import)
export const organizationRoutes = [
  route("/create", [sessionHandler, CreateOrganizationForm]),
  route("/:orgSlug", [sessionHandler, ManageOrganization]),
];

// Combine all routes into a single array
export const allRoutes = [
  render(Document, [
    route("/", () => new Response("Hello, World!")),
    prefix("/organization", organizationRoutes),
    route("/invitations/create", [sessionHandler, SendInvitation]),
    route("/invitations/:token", InvitationsPage),
    route("/login", [Login]),
    route("/signup", [SignUp]),
    // Add other UI routes within Document here if needed
    // route("/*", NotFoundPage), // Example: Needs NotFoundPage component
  ]),

  // Sign-in Route using the Use Case Effect
  route("/api/auth/*", [authResponse]),

  // Fallback for routes defined outside of render(Document, ...)
  // If you intend this only for API-like routes, adjust the path pattern
  route("/*", () => new Response("Not Found", { status: 404 })),
];
