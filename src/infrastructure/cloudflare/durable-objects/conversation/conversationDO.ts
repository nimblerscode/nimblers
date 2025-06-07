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
  async fetch(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;

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

      logger.info("Getting handler from getConversationHandler");

      // DEBUG: Add comprehensive state debugging
      logger.info("ConversationDO state debugging", {
        "state.id": this.state.id ? "exists" : "null",
        "state.id.name": this.state.id?.name || "undefined",
        "state.id.toString": this.state.id?.toString() || "undefined",
        "this.doId": this.doId,
        "state.storage": this.state.storage ? "exists" : "null",
        environment: this.env.ENVIRONMENT || "undefined",
        stateIdType: typeof this.state.id,
        stateIdNameType: typeof this.state.id?.name,
      });

      // Extract conversation ID from multiple sources (same pattern as OrganizationDO)
      let conversationId: string | null = null;

      // Method 1: Try state.id.name first (works in development)
      if (this.state.id.name) {
        conversationId = this.state.id.name;
        logger.info("Found conversation ID from state.id.name", {
          conversationId,
        });
      }

      // Method 2: Extract from request headers
      if (!conversationId) {
        conversationId = request.headers.get("X-Conversation-ID");
        if (conversationId) {
          logger.info("Found conversation ID from X-Conversation-ID header", {
            conversationId,
          });
        }
      }

      // Method 3: For conversation creation, extract from request body
      if (
        !conversationId &&
        url.pathname === "/conversation" &&
        method === "POST"
      ) {
        try {
          const body = (await request.clone().json()) as {
            id?: string;
            organizationSlug?: string;
          };
          if (body?.id) {
            conversationId = body.id;
            logger.info("Found conversation ID from request body", {
              conversationId,
            });
          }
        } catch (parseError) {
          logger.error("Failed to parse request body for conversation ID", {
            parseError,
          });
        }
      }

      // Method 4: Use DO ID as fallback (production fix - what actually works)
      if (!conversationId) {
        // In production, this.state.id.name is undefined but this.state.id.toString() contains the conversation ID
        // The campaign calls env.CONVERSATION_DO.idFromName(conversation.conversationId)
        // which means this.state.id.toString() should contain the original conversation ID
        conversationId = this.state.id.toString();
        logger.info("Using DO ID as conversation ID fallback", {
          conversationId,
        });
      }

      if (!conversationId) {
        logger.error("No conversation ID found in any source", {
          headers: Object.fromEntries(request.headers),
          pathname: url.pathname,
          method,
        });
        return new Response("Conversation ID not found", { status: 400 });
      }

      const finalConversationId: ConversationId =
        unsafeConversationId(conversationId);

      logger.info("Conversation ID resolved", {
        conversationId: finalConversationId,
        source: this.state.id.name ? "state.id.name" : "fallback",
      });

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

      // Get handler with the resolved conversation ID, Twilio config, and Shopify config
      const { handler } = getConversationHandler(
        this.state,
        finalConversationId,
        messagingConfig,
        shopifyConfig
      );

      logger.info("Handler obtained, calling with request");
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
