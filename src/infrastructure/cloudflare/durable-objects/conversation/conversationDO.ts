import {
  type ConversationId,
  unsafeConversationId,
} from "@/domain/tenant/shared/branded-types";
import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
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

export class ConversationDurableObject extends EffectDurableObjectBase {
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

      if (!this.state.id.name) {
        logger.error("No conversation ID found in any source", {
          doIdName: this.state.id.name,
          headers: Object.fromEntries(request.headers),
          pathname: url.pathname,
        });
        return new Response("Conversation ID not found", { status: 400 });
      }

      const conversationId: ConversationId = unsafeConversationId(
        this.state.id.name
      );

      logger.info("Conversation ID resolved", { conversationId });

      // Get Twilio configuration from environment
      const messagingConfig = {
        twilioAccountSid: this.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: this.env.TWILIO_AUTH_TOKEN,
        twilioFromNumber: this.env.TWILIO_FROM_NUMBER,
        twilioWebhookUrl: this.env.TWILIO_WEBHOOK_URL,
      };

      // Get handler with the resolved conversation ID and Twilio config
      const { handler } = getConversationHandler(
        this.state,
        conversationId,
        messagingConfig
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
