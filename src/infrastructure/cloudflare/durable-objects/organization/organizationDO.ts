// src/infrastructure/cloudflare/durable-objects/organization/organizationDO.ts
import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
import { getOrgHandler } from "./api/handlers";

// Simple logging utility that can be easily replaced with a proper logger
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    // In production, this could send to Cloudflare Analytics or external logging service
    // For now, we'll use a structured approach that can be easily replaced
    const logEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };
    // biome-ignore lint: Centralized logging utility
    console.log(JSON.stringify(logEntry));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    const logEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };
    // biome-ignore lint: Centralized logging utility
    console.error(JSON.stringify(logEntry));
  },
};

export class OrganizationDurableObject extends EffectDurableObjectBase {
  async fetch(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;

    logger.info("OrganizationDO fetch started", {
      method,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams),
      doId: this.doId,
    });

    try {
      // Add request logging with organization context
      logger.info(`OrganizationDO request: ${method} ${url.pathname}`, {
        doId: this.doId,
        method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams),
      });

      logger.info("Getting handler from getOrgHandler");

      // Extract organization slug from multiple sources
      let organizationSlug: string | null = null;

      // Method 1: Try doState.id.name first
      if (this.state.id.name) {
        organizationSlug = this.state.id.name;
        logger.info("Found slug from doState.id.name", {
          slug: organizationSlug,
        });
      }

      // Method 2: Extract from request headers
      if (!organizationSlug) {
        organizationSlug = request.headers.get("X-Organization-Slug");
        if (organizationSlug) {
          logger.info("Found slug from X-Organization-Slug header", {
            slug: organizationSlug,
          });
        }
      }

      // Method 3: Extract from URL path segments
      if (!organizationSlug) {
        const pathSegments = url.pathname.split("/").filter(Boolean);
        // For requests like /test/invite, /test/stores, etc., the org slug is the first segment
        // BUT NOT for API endpoints like /conversations/lookup, /campaigns, etc.
        const apiEndpoints = [
          "conversations",
          "campaigns",
          "segments",
          "customers",
          "invitations",
          "members",
          "stores",
        ];
        const isApiEndpoint =
          pathSegments.length > 0 && apiEndpoints.includes(pathSegments[0]);

        if (pathSegments.length > 0 && !isApiEndpoint) {
          organizationSlug = pathSegments[0]; // First segment is the organization slug
          logger.info("Found slug from URL path", { slug: organizationSlug });
        } else if (isApiEndpoint) {
          logger.info("Skipping URL path parsing for API endpoint", {
            firstSegment: pathSegments[0],
            pathname: url.pathname,
          });
        }
      }

      if (!organizationSlug) {
        logger.error("No organization slug found in any source", {
          doIdName: this.state.id.name,
          headers: Object.fromEntries(request.headers),
          pathname: url.pathname,
        });
        return new Response("Organization slug not found", { status: 400 });
      }

      logger.info("Organization slug resolved", { slug: organizationSlug });

      // Get handler with the resolved slug and CONVERSATION_DO binding
      const { handler } = getOrgHandler(
        this.state,
        organizationSlug,
        this.env.CONVERSATION_DO
      );

      logger.info("Handler obtained, calling with request");
      const response = await handler(request);

      const duration = Date.now() - startTime;
      logger.info("OrganizationDO fetch completed successfully", {
        status: response.status,
        duration: `${duration}ms`,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("OrganizationDO fetch failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      logger.error("OrganizationDO error handling request", {
        doId: this.doId,
        method,
        pathname: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Add health check endpoint
  async healthCheck(): Promise<Response> {
    try {
      // Basic health check - could be expanded to check database connectivity
      return new Response(
        JSON.stringify({
          status: "healthy",
          doId: this.doId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: "unhealthy",
          error: error instanceof Error ? error.message : String(error),
          doId: this.doId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Add method to get organization metrics (for monitoring)
  async getMetrics(): Promise<Response> {
    try {
      // This could be expanded to include actual metrics from the database
      const metrics = {
        doId: this.doId,
        uptime: Date.now(), // Could track actual uptime
        timestamp: new Date().toISOString(),
        // Add more metrics as needed
      };

      return new Response(JSON.stringify(metrics), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (_error) {
      return new Response(
        JSON.stringify({
          error: "Failed to retrieve metrics",
          doId: this.doId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}
