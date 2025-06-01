import type { AppContext } from "@/infrastructure/cloudflare/worker";

// Organization middleware for extracting activeOrganizationId from session
export async function organizationMiddleware({
  ctx,
}: {
  request: Request;
  ctx: AppContext;
}) {
  if (ctx.session?.activeOrganizationId) {
    ctx.organizationId = ctx.session.activeOrganizationId;
  } else {
    // No organization context - return error response instead of fallback
    return new Response(
      JSON.stringify({
        error: "Organization context required",
        message:
          "User must have an active organization to access this resource",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
