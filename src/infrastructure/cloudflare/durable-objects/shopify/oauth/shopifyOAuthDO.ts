import { Context, Effect, Layer } from "effect";
import { DurableObjectState } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import {
  DrizzleShopifyOAuthClient,
  DrizzleShopifyOAuthClientLive,
} from "@/infrastructure/persistence/tenant/sqlite/shopify/drizzle";
import { getShopifyOAuthHandler } from "./api/handlers";

// Durable Object namespace binding
export abstract class ShopifyOAuthDONamespace extends Context.Tag(
  "@infrastructure/shopify/oauth/DONamespace",
)<ShopifyOAuthDONamespace, DurableObjectNamespace>() {}

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

export class ShopifyOAuthDurableObject {
  protected readonly state: DurableObjectState;
  protected readonly env: Env;
  protected readonly doId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    this.state = ctx;
    this.env = env;
    this.doId = this.state.id.toString();

    // Run Shopify OAuth specific migrations
    this.state.blockConcurrencyWhile(async () => {
      try {
        const coreMigrationEffect = Effect.flatMap(
          DrizzleShopifyOAuthClient,
          (client) => client.migrate(),
        );
        const durableObjectStorageLayer = Layer.succeed(
          DurableObjectState,
          this.state,
        );
        const migrationSpecificProviderLayer = Layer.provide(
          DrizzleShopifyOAuthClientLive,
          durableObjectStorageLayer,
        );
        const layeredMigrationEffect = Effect.provide(
          coreMigrationEffect,
          migrationSpecificProviderLayer,
        );
        const fullyScopedEffect = Effect.scoped(layeredMigrationEffect);
        const effectToRun = fullyScopedEffect.pipe(
          Effect.catchAll((e) => {
            logger.error("Shopify OAuth migration failed", {
              error: e instanceof Error ? e.message : String(e),
              doId: this.doId,
            });
            return Effect.die(e);
          }),
        );
        await Effect.runPromise(effectToRun);

        logger.info("Shopify OAuth migrations completed successfully", {
          doId: this.doId,
        });
      } catch (e) {
        logger.error(
          "Failed to initialize ShopifyOAuth DO during blockConcurrencyWhile",
          {
            error: e instanceof Error ? e.message : String(e),
            doId: this.doId,
          },
        );
        throw new Error(
          `Failed to initialize ShopifyOAuth DO during blockConcurrencyWhile: ${e}`,
        );
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;

    try {
      // Add request logging with Shopify OAuth context
      logger.info(`ShopifyOAuthDO request: ${method} ${url.pathname}`, {
        doId: this.doId,
        method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams),
      });

      // Get the handler with proper error handling
      const { handler } = getShopifyOAuthHandler(this.state);
      const response = await handler(request);

      // Log successful responses
      const duration = Date.now() - startTime;
      logger.info(`ShopifyOAuthDO response: ${response.status}`, {
        duration: `${duration}ms`,
        status: response.status,
        doId: this.doId,
      });

      return response;
    } catch (error) {
      // Enhanced error handling with context
      const duration = Date.now() - startTime;
      logger.error("ShopifyOAuthDO error handling request", {
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

  // Add method to get OAuth metrics (for monitoring)
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

  // Cleanup expired nonces periodically
  async alarm() {
    try {
      logger.info("ShopifyOAuthDO alarm triggered for cleanup", {
        doId: this.doId,
      });

      // Use the Drizzle adapter for cleanup
      const { handler } = getShopifyOAuthHandler(this.state);

      // We could call a cleanup endpoint here, but for now we'll use direct SQL
      await this.state.storage.sql.exec(
        "DELETE FROM nonces WHERE expires_at < ?",
        new Date().toISOString(),
      );

      // Set next cleanup in 1 hour
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);

      logger.info("ShopifyOAuthDO cleanup completed", {
        doId: this.doId,
      });
    } catch (error) {
      logger.error("ShopifyOAuthDO cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
        doId: this.doId,
      });
    }
  }
}
