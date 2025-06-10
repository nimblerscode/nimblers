import {
  type ConversationId,
  unsafeConversationId,
} from "@/domain/tenant/shared/branded-types";
import { ConversationDurableObjectBase } from "../base/ConversationDurableObjectBase";
import { getConversationHandler } from "./api/handlers";
import { Effect, Layer, Schema } from "effect";
import {
  createMCPServerLayer,
  MCPServerService,
  type MCPServerConfig,
  type ToolHandler,
  type MCPRequest,
  type MCPResponse,
  MCPError,
} from "./mcp-server";

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
  private mcpServerLayer: Layer.Layer<MCPServerService, never> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    logger.info("ConversationDO initialized", {
      doId: this.doId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Initialize MCP server layer with tools - called when MCP is needed
   */
  private initializeMCPServerLayer(tools: ToolHandler[]): void {
    if (this.mcpServerLayer) return; // Already initialized

    const config: MCPServerConfig = {
      serverInfo: {
        name: "conversation-mcp-server",
        version: "1.0.0",
        description: "MCP server for conversation context",
      },
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
    };

    this.mcpServerLayer = createMCPServerLayer(config, tools);

    logger.info("MCP server layer initialized", {
      toolCount: tools.length,
      doId: this.doId,
    });
  }

  /**
   * Handle MCP requests using Effect-TS
   */
  private async handleMCPRequest(request: Request): Promise<Response> {
    try {
      const mcpRequest = (await request.json()) as MCPRequest;

      logger.info("Processing MCP request", {
        method: mcpRequest.method,
        id: mcpRequest.id,
        doId: this.doId,
      });

      // Initialize MCP server layer with context-aware tools if not already done
      if (!this.mcpServerLayer) {
        const tools = await this.createContextAwareTools();
        this.initializeMCPServerLayer(tools);
      }

      // Use Effect-TS to handle the request
      const program = Effect.gen(function* () {
        const mcpService = yield* MCPServerService;
        return yield* mcpService.handleRequest(mcpRequest);
      });

      const response: MCPResponse = await Effect.runPromise(
        program.pipe(Effect.provide(this.mcpServerLayer!))
      );

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("MCP request failed", {
        error: error instanceof Error ? error.message : String(error),
        doId: this.doId,
      });

      const errorResponse: MCPResponse = {
        jsonrpc: "2.0",
        id: 0, // Default ID when we can't extract from request
        error: {
          code: -32603,
          message: "Internal error processing MCP request",
          data: error instanceof Error ? error.message : String(error),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Create context-aware tools for this conversation
   */
  private async createContextAwareTools(): Promise<ToolHandler[]> {
    const conversationId = this.getConversationIdFromContext();

    // Create conversation-specific tools with simple schemas
    const tools: ToolHandler[] = [
      // Conversation history tool
      {
        name: "get_conversation_history",
        description: "Get the conversation history for this conversation",
        inputSchema: Schema.Struct({}),
        execute: () => {
          return Effect.succeed(
            `Conversation history for ${conversationId}: [placeholder - integrate with your conversation storage]`
          );
        },
      },

      // Send message tool
      {
        name: "send_message",
        description: "Send a message in this conversation",
        inputSchema: Schema.Struct({
          message: Schema.String,
          type: Schema.Union(Schema.Literal("sms"), Schema.Literal("email")),
        }),
        execute: (args: unknown) => {
          const { message, type } = args as {
            message: string;
            type: "sms" | "email";
          };
          return Effect.succeed(
            `Message sent via ${type}: "${message}" in conversation ${conversationId}`
          );
        },
      },

      // Customer info tool
      {
        name: "get_customer_info",
        description: "Get customer information for this conversation",
        inputSchema: Schema.Struct({}),
        execute: () => {
          return Effect.succeed(
            `Customer info for conversation ${conversationId}: [placeholder - integrate with customer storage]`
          );
        },
      },
    ];

    // Add Shopify tools if available (using environment check)
    try {
      if ((this.env as any).SHOPIFY_API_KEY) {
        tools.push({
          name: "get_order_info",
          description: "Get Shopify order information",
          inputSchema: Schema.Struct({
            orderId: Schema.String,
          }),
          execute: (args: unknown) => {
            const { orderId } = args as { orderId: string };
            return Effect.succeed(
              `Order info for ${orderId}: [placeholder - integrate with Shopify service]`
            );
          },
        });
      }
    } catch {
      // Ignore Shopify environment check errors
    }

    return tools;
  }

  /**
   * Get conversation ID from various context sources
   */
  private getConversationIdFromContext(): string {
    // Try to get conversation ID from DO state first
    if (this.state.id.name) {
      return this.state.id.name;
    }

    // Fallback to DO ID
    return this.doId;
  }

  /**
   * Minimal fetch method - delegates all non-MCP requests to handler
   * Clean separation: DO only handles MCP, everything else goes to business logic
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Only handle MCP requests directly in the DO
    if (url.pathname === "/mcp" && method === "POST") {
      return this.handleMCPRequest(request);
    }

    // For all other requests, delegate to the conversation handler
    // This includes: /health, /conversation, /messages, /webhook, etc.
    try {
      logger.info("Delegating request to conversation handler", {
        method,
        pathname: url.pathname,
        doId: this.doId,
      });

      // Extract conversation ID from DO context
      const conversationId = this.getConversationIdFromContext();

      if (!conversationId) {
        logger.error("No conversation ID found", {
          doIdName: this.state.id.name,
          pathname: url.pathname,
        });
        return new Response("Conversation ID not found", { status: 400 });
      }

      // Get configuration from environment
      const messagingConfig = {
        twilioAccountSid: this.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: this.env.TWILIO_AUTH_TOKEN,
        twilioFromNumber: this.env.TWILIO_FROM_NUMBER,
        twilioWebhookUrl: this.env.TWILIO_WEBHOOK_URL,
      };

      const shopifyStoreDomain =
        request.headers.get("X-Shopify-Store-Domain") ||
        "default-store.myshopify.com";
      const shopifyConfig = { storeDomain: shopifyStoreDomain };

      // Delegate to handler - this handles ALL business logic
      const { handler } = getConversationHandler(
        this.state,
        unsafeConversationId(conversationId),
        messagingConfig,
        shopifyConfig,
        this.env
      );

      return await handler(request);
    } catch (error) {
      logger.error("Failed to delegate request to handler", {
        error: error instanceof Error ? error.message : String(error),
        doId: this.doId,
        method,
        pathname: url.pathname,
      });

      return new Response("Internal Server Error", { status: 500 });
    }
  }
}
