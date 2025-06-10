import { Effect, Layer, Schema, Data, Context } from "effect";
import {
  ConversationAIService,
  AIConversationError,
  AIProcessingError,
  type ProcessConversationMessageRequest,
  type ProcessConversationMessageResponse,
} from "@/domain/tenant/conversations/ai-service";
import {
  ConversationRepo,
  MessageRepo,
} from "@/domain/tenant/conversations/service";
import { AnthropicService } from "@/infrastructure/ai/anthropic/client";
import {
  unsafeMessageContent,
  type MessageContent,
} from "@/domain/tenant/shared/branded-types";

// Anthropic Message Schema
const AnthropicMessage = Schema.Struct({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
});

// Processing context schema
const ProcessingContext = Schema.Struct({
  shopifyStoreDomain: Schema.optional(Schema.String),
  hasTools: Schema.Boolean,
  messageHistory: Schema.Array(AnthropicMessage),
  conversationMetadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
});

export type ProcessingContext = Schema.Schema.Type<typeof ProcessingContext>;

export const AnthropicConversationAIServiceLive = Layer.effect(
  ConversationAIService,
  Effect.gen(function* () {
    const conversationRepo = yield* ConversationRepo;
    const messageRepo = yield* MessageRepo;
    const anthropicService = yield* AnthropicService;

    return {
      processMessage: (request: ProcessConversationMessageRequest) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            "Processing conversation message with Anthropic",
            {
              conversationId: request.conversationId,
              hasShopifyDomain: !!request.shopifyStoreDomain,
            }
          );

          // Build processing context
          const context = yield* buildProcessingContext(
            request,
            conversationRepo,
            messageRepo
          );

          // Process with appropriate strategy
          const response = yield* processWithMCPTools(
            request,
            context,
            anthropicService
          );

          return response;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(
              new AIConversationError({
                reason: `Processing failed: ${error._tag || String(error)}`,
                conversationId: request.conversationId,
                cause: error,
              })
            )
          ),
          Effect.withSpan("AnthropicConversationAIService.processMessage")
        ),
    };
  })
);

// Build processing context from conversation data
function buildProcessingContext(
  request: ProcessConversationMessageRequest,
  conversationRepo: Context.Tag.Service<ConversationRepo>,
  messageRepo: Context.Tag.Service<MessageRepo>
): Effect.Effect<ProcessingContext, AIConversationError> {
  return Effect.gen(function* () {
    // Get conversation context
    const conversation = yield* conversationRepo
      .get(request.conversationId)
      .pipe(
        Effect.catchAll(() => Effect.succeed(null)),
        Effect.mapError(
          (error) =>
            new AIConversationError({
              reason: `Failed to fetch conversation: ${error}`,
              conversationId: request.conversationId,
              cause: error,
            })
        )
      );

    // Get recent message history
    const recentMessages = yield* messageRepo
      .getAllMessages({
        limit: 200,
        direction: undefined,
        cursor: undefined,
      })
      .pipe(
        Effect.map((response) => [...(response[0]?.messages || [])]),
        Effect.catchAll(() => Effect.succeed([])),
        Effect.mapError(
          (error) =>
            new AIConversationError({
              reason: `Failed to fetch message history: ${error}`,
              conversationId: request.conversationId,
              cause: error,
            })
        )
      );

    // Build Anthropic message format
    const messageHistory = recentMessages
      .slice(-20) // Keep last 20 messages for context
      .map((msg) => ({
        role: (msg.direction === "inbound" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: String(msg.content),
      }));

    const context: ProcessingContext = {
      shopifyStoreDomain: request.shopifyStoreDomain,
      hasTools: !!request.shopifyStoreDomain,
      messageHistory,
      conversationMetadata: conversation
        ? {
            customerPhone: conversation.customerPhone,
            organizationSlug: request.organizationSlug,
          }
        : undefined,
    };

    return context;
  });
}

// Process with MCP tools using Claude's native MCP support
function processWithMCPTools(
  request: ProcessConversationMessageRequest,
  context: ProcessingContext,
  anthropicService: Context.Tag.Service<AnthropicService>
): Effect.Effect<
  ProcessConversationMessageResponse,
  AIConversationError | AIProcessingError
> {
  return Effect.gen(function* () {
    yield* Effect.logInfo("Processing with native Shopify MCP integration");

    // Build system prompt
    const systemPrompt = buildECommerceSystemPrompt(request, context);

    // Prepare messages including conversation history
    const messages = [
      ...context.messageHistory,
      {
        role: "user" as const,
        content: String(request.messageContent),
      },
    ];

    // Use native MCP connector instead of manual orchestration
    const mcpServerUrl = `https://${request.shopifyStoreDomain}/api/mcp`;
    const mcpServerName = "shopify-store";

    yield* Effect.logInfo("Calling Anthropic with native MCP", {
      messageCount: messages.length,
      hasSystemPrompt: !!systemPrompt,
      mcpServerUrl,
      mcpServerName,
      model: "claude-3-5-haiku-20241022",
    });

    const response = yield* anthropicService
      .processMessageWithMCP({
        messages,
        systemPrompt,
        mcpServerUrl,
        mcpServerName,
      })
      .pipe(
        Effect.mapError(
          (error) =>
            new AIConversationError({
              reason: error.message,
              cause: error,
            })
        )
      );

    // Extract final message from Claude's response
    const finalMessage =
      response.content
        ?.filter((block: any) => block.type === "text")
        ?.map((block: any) => block.text)
        ?.join(" ")
        ?.trim() || "";

    // Check if tools were used (MCP tools show up as mcp_tool_use blocks)
    const usedMCPTools =
      response.content?.some((block: any) => block.type === "mcp_tool_use") ||
      false;

    const mcpToolsExecuted =
      response.content
        ?.filter((block: any) => block.type === "mcp_tool_use")
        ?.map((block: any) => block.name) || [];

    yield* Effect.logInfo("Native MCP response processed", {
      usedMCPTools,
      mcpToolsExecuted,
      responseLength: finalMessage.length,
      contentBlocks: response.content?.length || 0,
    });

    return {
      responseMessage: unsafeMessageContent(
        finalMessage || "I'm here to help! How can I assist you today?"
      ),
      conversationId: request.conversationId,
      processingMetadata: {
        usedTools: usedMCPTools,
        toolsExecuted: mcpToolsExecuted,
        responseLength: finalMessage.length,
      },
    };
  });
}

// Build generic e-commerce system prompt that relies on Claude + MCP intelligence
function buildECommerceSystemPrompt(
  request: ProcessConversationMessageRequest,
  context: ProcessingContext
): string {
  const contextInfo = [
    `Store: ${request.shopifyStoreDomain}`,
    `Organization: ${request.organizationSlug}`,
    `Conversation: ${request.conversationId}`,
    context.conversationMetadata?.customerPhone
      ? `Customer: ${context.conversationMetadata.customerPhone}`
      : "",
  ]
    .filter(Boolean)
    .join(". ");

  return `You are a helpful customer service assistant for an e-commerce store.

${contextInfo}

You have access to tools that can help customers with their shopping needs:
- search_shop_catalog: Find products in the store
- get_cart: View the current cart contents  
- update_cart: Add/remove items from the cart
- get_product_details: Get detailed product information
- search_shop_policies_and_faqs: Find store policies and FAQ answers

IMPORTANT GUIDELINES:
1. When customers want to add items to their cart, use update_cart with the product variant ID
2. When customers ask about their cart, use get_cart to show them what's in it
3. When customers confirm they want to purchase ("yes", "add it", "I want to pay"), take action immediately
4. After using tools, always provide a complete, helpful response based on the tool results
5. Be proactive - if a customer expresses interest in a product, help them add it to their cart

Example interactions:
- Customer: "Add the yellow sofa" → Use search_shop_catalog to find it, then update_cart to add it
- Customer: "Show me my cart" → Use get_cart to display current items
- Customer: "Yes, add it to cart" → Use update_cart immediately

Be conversational, helpful, and take action when customers express clear intent.`;
}

// Note: Manual MCP conversation cycle removed - now using Anthropic's native MCP connector
