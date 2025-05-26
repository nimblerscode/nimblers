import type { Session, User } from "better-auth";
import { defineApp } from "rwsdk/worker";

import { allRoutes } from "@/config/routes";
import { OrganizationDurableObject } from "./durable-objects/organization/organizationDO";

export type AppContext = {
  session?: Session;
  user?: User;
};

const corsOPTIONSHandler = async ({ request }: { request: Request }) => {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
      "https://nimblers.co",
      "https://www.nimblers.co",
      "http://localhost:5173", // Development
      "http://localhost:3000", // Alternative dev port
    ];

    const isAllowedOrigin = origin && allowedOrigins.includes(origin);

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : "https://nimblers.co",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }
  // If not an OPTIONS request, do nothing and let subsequent handlers proceed.
  // For actual requests, CORS headers would need to be added to their responses.
};

// Placeholder for a security headers middleware function
// Note: Applying these to all *outgoing* responses globally via this middleware
// is non-trivial. Typically, route handlers add these, or a wrapping function.
const addSecurityHeadersToContext = async ({
  ctx,
}: {
  ctx: AppContext & { securityHeaders?: Record<string, string> };
}) => {
  // This middleware can't directly modify the final response headers easily.
  // It can prepare headers in ctx for route handlers to use.
  ctx.securityHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  };
};

// The defineApp with the service setup middleware
export default defineApp([
  corsOPTIONSHandler, // Handles CORS preflight requests
  addSecurityHeadersToContext, // Prepares security headers in context
  ...allRoutes,
]);

// Re-export the Durable Object class for wrangler.jsonc
export { OrganizationDurableObject };
