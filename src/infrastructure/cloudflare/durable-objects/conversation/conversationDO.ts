import {
  type ConversationId,
  unsafeConversationId,
} from "@/domain/tenant/shared/branded-types";
import { ConversationDurableObjectBase } from "../base/ConversationDurableObjectBase";
import { getConversationHandler } from "./api/handlers";

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

export class ConversationDurableObject extends ConversationDurableObjectBase {
  constructor(ctx: DurableObjectState, env: Env) {
    // IMMEDIATE LOGGING TO TRACK DO CREATION
    console.log("=== CONVERSATION DO CONSTRUCTOR CALLED ===", {
      timestamp: new Date().toISOString(),
      doId: ctx.id.toString(),
    });

    try {
      super(ctx, env);
      console.log("=== CONVERSATION DO CONSTRUCTOR COMPLETED ===", {
        timestamp: new Date().toISOString(),
        doId: this.doId,
      });
    } catch (error) {
      console.error("=== CONVERSATION DO CONSTRUCTOR FAILED ===", {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async fetch(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;

    // IMMEDIATE HEALTH CHECK FOR BASIC DO CONNECTIVITY
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          doId: this.doId,
          timestamp: new Date().toISOString(),
          method,
          pathname: url.pathname,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // IMMEDIATE DEBUG LOGGING TO TRACK FAILURE POINT
    try {
      logger.info("=== CONVERSATION DO FETCH START - IMMEDIATE ===", {
        method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams),
        doId: this.doId,
        timestamp: new Date().toISOString(),
      });

      logger.info("ConversationDO fetch started", {
        method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams),
        doId: this.doId,
      });

      try {
        // Add request logging with conversation context
        logger.info(`ConversationDO request: ${method} ${url.pathname}`, {
          doId: this.doId,
          method,
          pathname: url.pathname,
          searchParams: Object.fromEntries(url.searchParams),
        });

        // Debug: Log exact URL being received
        logger.info("=== CONVERSATION DO URL DEBUG ===", {
          fullUrl: request.url,
          method,
          pathname: url.pathname,
          searchParams: Object.fromEntries(url.searchParams),
          headers: Object.fromEntries(request.headers),
        });

        logger.info("Getting handler from getConversationHandler");

        // Extract conversation ID from multiple sources (same pattern as OrganizationDO)
        let conversationId: string | null = null;

        logger.info("=== STARTING CONVERSATION ID RESOLUTION ===");

        // Method 1: Try doState.id.name first
        if (this.state.id.name) {
          conversationId = this.state.id.name;
          logger.info("Found conversation ID from doState.id.name", {
            conversationId,
          });
        } else {
          logger.info("doState.id.name is null/undefined");
        }

        // Method 2: Extract from request headers
        if (!conversationId) {
          conversationId = request.headers.get("X-Conversation-ID");
          if (conversationId) {
            logger.info("Found conversation ID from X-Conversation-ID header", {
              conversationId,
            });
          } else {
            logger.info("No X-Conversation-ID header found");
          }
        }

        // Method 3: For API endpoints, skip URL path parsing (like OrganizationDO)
        if (!conversationId) {
          const pathSegments = url.pathname.split("/").filter(Boolean);
          logger.info("Attempting URL path parsing", {
            pathSegments,
            pathname: url.pathname,
          });

          // For requests like /conversation, /messages, etc., don't extract from URL path
          // These are internal API calls, not public conversation URLs
          const apiEndpoints = ["conversation", "messages", "sms", "webhook"];
          const isApiEndpoint =
            pathSegments.length > 0 && apiEndpoints.includes(pathSegments[0]);

          if (pathSegments.length > 0 && !isApiEndpoint) {
            conversationId = pathSegments[0]; // First segment could be the conversation ID
            logger.info("Found conversation ID from URL path", {
              conversationId,
            });
          } else if (isApiEndpoint) {
            logger.info("Skipping URL path parsing for API endpoint", {
              firstSegment: pathSegments[0],
              pathname: url.pathname,
            });
          }
        }

        logger.info("=== CONVERSATION ID RESOLUTION COMPLETE ===", {
          conversationId,
          found: !!conversationId,
        });

        if (!conversationId) {
          logger.error("No conversation ID found in any source", {
            doIdName: this.state.id.name,
            headers: Object.fromEntries(request.headers),
            pathname: url.pathname,
          });
          return new Response("Conversation ID not found", { status: 400 });
        }

        logger.info("Conversation ID resolved", { conversationId });

        const finalConversationId: ConversationId =
          unsafeConversationId(conversationId);

        logger.info("=== CREATING CONVERSATION HANDLER ===");

        // Get Twilio configuration from environment
        const messagingConfig = {
          twilioAccountSid: this.env.TWILIO_ACCOUNT_SID,
          twilioAuthToken: this.env.TWILIO_AUTH_TOKEN,
          twilioFromNumber: this.env.TWILIO_FROM_NUMBER,
          twilioWebhookUrl: this.env.TWILIO_WEBHOOK_URL,
        };

        // Get Shopify store domain from request header (caller should provide this)
        const shopifyStoreDomain =
          request.headers.get("X-Shopify-Store-Domain") ||
          "default-store.myshopify.com";
        const shopifyConfig = { storeDomain: shopifyStoreDomain };

        logger.info("Using Shopify store domain", {
          storeDomain: shopifyStoreDomain,
          source: request.headers.get("X-Shopify-Store-Domain")
            ? "header"
            : "default",
        });

        logger.info("=== CALLING getConversationHandler ===", {
          conversationId: finalConversationId,
          messagingConfig: {
            twilioAccountSid: messagingConfig.twilioAccountSid
              ? "present"
              : "missing",
            twilioAuthToken: messagingConfig.twilioAuthToken
              ? "present"
              : "missing",
            twilioFromNumber: messagingConfig.twilioFromNumber,
            twilioWebhookUrl: messagingConfig.twilioWebhookUrl,
          },
          shopifyConfig,
        });

        // Get handler with the resolved conversation ID, Twilio config, and Shopify config
        const { handler } = getConversationHandler(
          this.state,
          finalConversationId,
          messagingConfig,
          shopifyConfig,
          this.env
        );

        logger.info("=== HANDLER OBTAINED, CALLING WITH REQUEST ===");
        const response = await handler(request);

        const duration = Date.now() - startTime;
        logger.info("ConversationDO fetch completed successfully", {
          status: response.status,
          duration: `${duration}ms`,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error("ConversationDO fetch failed", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration: `${duration}ms`,
        });

        logger.error("ConversationDO error handling request", {
          doId: this.doId,
          method,
          pathname: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        });

        return new Response("Internal Server Error", { status: 500 });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("ConversationDO fetch failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      logger.error("ConversationDO error handling request", {
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

  // Add method to get conversation metrics (for monitoring)
  async getMetrics(): Promise<Response> {
    try {
      // This could be expanded to include actual metrics from the database
      const metrics = {
        doId: this.doId,
        uptime: Date.now(), // Could track actual uptime
        timestamp: new Date().toISOString(),
        // Add more metrics as needed (message count, last activity, etc.)
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
