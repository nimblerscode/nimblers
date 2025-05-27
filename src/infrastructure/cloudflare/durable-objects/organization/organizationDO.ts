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

    try {
      // Add request logging with organization context
      logger.info(`OrganizationDO request: ${method} ${url.pathname}`, {
        doId: this.doId,
        method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams),
      });

      // Get the handler with proper error handling
      const { handler } = getOrgHandler(this.state);
      const response = await handler(request);

      // Log successful responses
      const duration = Date.now() - startTime;
      logger.info(`OrganizationDO response: ${response.status}`, {
        duration: `${duration}ms`,
        status: response.status,
        doId: this.doId,
      });

      return response;
    } catch (error) {
      // Enhanced error handling with context
      const duration = Date.now() - startTime;
      logger.error("OrganizationDO error handling request", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
        doId: this.doId,
        method,
        pathname: url.pathname,
      });

      // Return structured error response
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "An error occurred while processing your request",
          timestamp: new Date().toISOString(),
          requestId: this.doId,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": this.doId,
          },
        },
      );
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
        },
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
        },
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
        },
      );
    }
  }
}
