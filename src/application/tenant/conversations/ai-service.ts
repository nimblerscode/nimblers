import { Effect, Layer } from "effect";
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
import { WorkersAI } from "@/domain/global/ai/service";
import {
  unsafeMessageContent,
  type MessageContent,
} from "@/domain/tenant/shared/branded-types";

export const ConversationAIServiceLive = Layer.effect(
  ConversationAIService,
  Effect.gen(function* () {
    const conversationRepo = yield* ConversationRepo;
    const messageRepo = yield* MessageRepo;
    const aiService = yield* WorkersAI;

    return {
      processMessage: (request: ProcessConversationMessageRequest) =>
        Effect.gen(function* () {
          yield* Effect.logInfo("Processing conversation message with AI", {
            conversationId: request.conversationId,
            hasShopifyDomain: !!request.shopifyStoreDomain,
          });

          // Get conversation context
          const conversation = yield* conversationRepo
            .get(request.conversationId)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));

          // Get recent message history for context
          const recentMessages = yield* messageRepo
            .getAllMessages({
              limit: 200,
              direction: undefined,
              cursor: undefined,
            })
            .pipe(
              Effect.map((response) => [...(response[0]?.messages || [])]),
              Effect.catchAll(() => Effect.succeed([] as any[]))
            );

          // Process with Shopify AI if domain available, otherwise basic AI
          if (request.shopifyStoreDomain) {
            const response = yield* processWithShopifyAI(
              request,
              conversation,
              recentMessages,
              aiService
            );
            return response;
          } else {
            const response = yield* processWithBasicAI(request);
            return response;
          }
        }).pipe(
          Effect.catchAll((error) => {
            // Better error message extraction
            const errorMessage =
              error instanceof Error
                ? error.message
                : typeof error === "string"
                ? error
                : error?.reason || error?._tag || JSON.stringify(error);

            console.error("ConversationAI processing failed:", {
              error,
              errorMessage,
              errorType: error?._tag || typeof error,
              conversationId: request.conversationId,
            });

            return Effect.fail(
              new AIConversationError({
                reason: `Failed to process message: ${errorMessage}`,
                conversationId: request.conversationId,
                cause: error,
              })
            );
          }),
          Effect.withSpan("ConversationAIService.processMessage")
        ),
    };
  })
);

// Process message with Shopify AI and MCP tools (Enhanced version from ConversationAgent)
function processWithShopifyAI(
  request: ProcessConversationMessageRequest,
  conversation: any,
  recentMessages: any[],
  aiService: Ai
): Effect.Effect<ProcessConversationMessageResponse, AIProcessingError> {
  return Effect.gen(function* () {
    yield* Effect.logInfo("Processing with enhanced Shopify AI + MCP");

    // Build conversation history for AI context (like ConversationAgent)
    const messageHistory = recentMessages.map((msg) => ({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: String(msg.content),
      timestamp: msg.sentAt?.getTime() || Date.now(),
    }));

    // Create comprehensive context for AI
    const contextInfo = [
      `Store: ${request.shopifyStoreDomain}`,
      `Organization: ${request.organizationSlug}`,
      `Conversation: ${request.conversationId}`,
      conversation?.customerPhone
        ? `Customer: ${conversation.customerPhone}`
        : "",
    ]
      .filter(Boolean)
      .join(". ");

    // Enhanced AI system prompt (from ConversationAgent)
    const systemPrompt = `You are a helpful customer service assistant for an e-commerce store (${request.shopifyStoreDomain}).

${contextInfo}

CRITICAL INSTRUCTIONS FOR FUNCTION CALLING:
- When customers ask about products, catalogs, or items, you MUST use the search_shop_catalog tool
- When customers ask about policies, shipping, returns, or store information, use search_shop_policies_and_faqs tool
- NEVER make up or invent product information 
- NEVER create fake product listings or JSON responses
- ALWAYS call the appropriate tool first when users ask about products or policies
- Only provide information that comes from actual tool results

For non-product/policy questions (greetings, general inquiries), provide helpful conversational responses.

IMPORTANT: Keep responses concise (2-3 sentences max) and conversational. After using tools, humanize the results into natural, friendly language.`;

    // Prepare messages with conversation history (like ConversationAgent)
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      // Include recent conversation history for context
      ...messageHistory.slice(-20).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      // Add current user message with explicit function calling instruction
      {
        role: "user" as const,
        content: `${String(request.messageContent)}

[INSTRUCTION: If this is about products, use the search_shop_catalog FUNCTION CALL (not JSON text). If about policies, use search_shop_policies_and_faqs FUNCTION CALL. Do not write JSON text responses.]`,
      },
    ];

    // Get available MCP tools (from ConversationAgent logic)
    yield* Effect.logInfo("Fetching available MCP tools");
    const tools = yield* getAvailableMCPTools(request.shopifyStoreDomain!);

    yield* Effect.logInfo("Calling AI with tools", {
      toolCount: tools.length,
      hasHistory: messageHistory.length > 0,
    });

    // Call AI with tools (enhanced version from ConversationAgent)
    const response = yield* Effect.tryPromise({
      try: () => {
        const aiPayload: any = {
          messages,
          max_tokens: 500,
          temperature: 0.7,
        };

        if (tools.length > 0) {
          aiPayload.tools = tools;
        }

        return aiService.run(
          "@cf/meta/llama-4-scout-17b-16e-instruct",
          aiPayload
        );
      },
      catch: (error) =>
        new AIProcessingError({
          reason: `AI call failed: ${error}`,
          conversationId: request.conversationId,
          cause: error,
        }),
    });

    yield* Effect.logInfo("AI response received", {
      hasToolCalls: !!(response as any)?.tool_calls?.length,
      toolCallsLength: (response as any)?.tool_calls?.length || 0,
    });

    // Process AI response and handle tool calls (from ConversationAgent)
    const processedResponse = yield* processAIResponseWithTools(
      response,
      request.messageContent,
      request.shopifyStoreDomain!,
      aiService
    );

    return {
      responseMessage: unsafeMessageContent(processedResponse.message),
      conversationId: request.conversationId,
      processingMetadata: {
        usedTools: processedResponse.usedTools,
        toolsExecuted: processedResponse.toolsExecuted,
        responseLength: processedResponse.message.length,
      },
    };
  });
}

// Process message with basic AI (no Shopify tools)
function processWithBasicAI(
  request: ProcessConversationMessageRequest
): Effect.Effect<ProcessConversationMessageResponse, AIProcessingError> {
  return Effect.gen(function* () {
    const response = `Hi! I received your message: "${request.messageContent}". How can I help you today?`;

    return {
      responseMessage: unsafeMessageContent(response),
      conversationId: request.conversationId,
      processingMetadata: {
        usedTools: false,
        toolsExecuted: [],
        responseLength: response.length,
      },
    };
  });
}

// Helper functions ported from ConversationAgent.ts

// Get available MCP tools from Shopify store
function getAvailableMCPTools(
  shopifyStoreDomain: string
): Effect.Effect<any[], AIProcessingError> {
  return Effect.gen(function* () {
    try {
      const mcpUrl = `https://${shopifyStoreDomain}/api/mcp`;

      yield* Effect.logInfo("Fetching available MCP tools");

      const tools = yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch(mcpUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Store-Domain": shopifyStoreDomain,
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
            }),
          });

          if (!response.ok) {
            console.warn(`MCP server responded with ${response.status}`);
            return [];
          }

          const data = (await response.json()) as {
            result?: { tools?: any[] };
          };
          const availableTools = data.result?.tools || [];

          console.log(`Found ${availableTools.length} MCP tools available`);

          // Format tools for Workers AI (OpenAI function calling format)
          return availableTools.map((tool: any) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema ||
                tool.input_schema || {
                  type: "object",
                  properties: {},
                  required: [],
                },
            },
          }));
        },
        catch: (error) =>
          new AIProcessingError({
            reason: `Failed to fetch MCP tools: ${error}`,
            conversationId: "unknown" as any,
            cause: error,
          }),
      });

      return tools;
    } catch (error) {
      yield* Effect.logWarning(`MCP tools fetch error: ${error}`);
      return [];
    }
  });
}

// Process AI response with tool calling (from ConversationAgent.ts)
function processAIResponseWithTools(
  response: any,
  originalMessage: MessageContent,
  shopifyStoreDomain: string,
  aiService: Ai
): Effect.Effect<
  { message: string; usedTools: boolean; toolsExecuted: string[] },
  AIProcessingError
> {
  return Effect.gen(function* () {
    let usedTools = false;
    let toolsExecuted: string[] = [];

    console.log("🔍 AI response received:", {
      hasToolCalls: !!(response as any)?.tool_calls?.length,
      toolCallsLength: (response as any)?.tool_calls?.length || 0,
    });

    // Handle tool calls if the AI decided to use tools
    if (
      typeof response === "object" &&
      response !== null &&
      "tool_calls" in response &&
      Array.isArray(response.tool_calls) &&
      response.tool_calls.length > 0
    ) {
      console.log("🔍 Processing tool calls:", response.tool_calls.length);
      usedTools = true;
      let toolResults: Array<{ name: string; result: string }> = [];

      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function?.name || toolCall.name;
        console.log("🔍 Executing tool call:", { toolName });
        toolsExecuted.push(toolName);

        const toolResult = yield* executeShopifyMCPTool(
          shopifyStoreDomain,
          toolName,
          JSON.parse(toolCall.function?.arguments || toolCall.arguments || "{}")
        );

        if (toolResult) {
          toolResults.push({
            name: toolName,
            result: toolResult,
          });
        }
      }

      // Humanize tool results using AI
      if (toolResults.length > 0) {
        console.log("🔍 Tool results collected, humanizing...");
        const humanizedMessage = yield* humanizeToolResults(
          toolResults,
          originalMessage,
          aiService
        );
        return { message: humanizedMessage, usedTools, toolsExecuted };
      }
    }

    // Check if response contains JSON function call as text (fallback)
    const responseContent = String(
      response.response || response.choices?.[0]?.message?.content || response
    );

    console.log(
      "🔍 Response content (first 200 chars):",
      responseContent.substring(0, 200)
    );

    if (
      responseContent.includes('"function"') ||
      responseContent.includes('"arguments"')
    ) {
      console.log(
        "🔍 Detected JSON function call in text response, attempting to parse and execute"
      );

      try {
        const jsonMatch = responseContent.match(/\{[^}]*"function"[^}]*\}/);
        if (jsonMatch) {
          const toolCall = JSON.parse(jsonMatch[0]);
          console.log("🔍 Parsed tool call:", toolCall);

          usedTools = true;
          toolsExecuted.push(toolCall.function);

          const toolResult = yield* executeShopifyMCPTool(
            shopifyStoreDomain,
            toolCall.function,
            toolCall.arguments || {}
          );

          if (toolResult) {
            console.log(
              "🔍 Manual tool execution successful, humanizing result"
            );
            const humanizedMessage = yield* humanizeToolResults(
              [{ name: toolCall.function, result: toolResult }],
              originalMessage,
              aiService
            );
            return { message: humanizedMessage, usedTools, toolsExecuted };
          }
        }
      } catch (parseError) {
        console.log("🔍 Failed to parse JSON function call:", parseError);
      }
    }

    console.log("🔍 No tool calls, returning direct response");
    const finalMessage =
      responseContent || "I'm here to help! How can I assist you today?";
    return { message: finalMessage, usedTools, toolsExecuted };
  });
}

// Execute Shopify MCP tool (from ConversationAgent.ts)
function executeShopifyMCPTool(
  shopifyStoreDomain: string,
  toolName: string,
  toolArguments: any
): Effect.Effect<string | null, AIProcessingError> {
  return Effect.gen(function* () {
    try {
      const mcpUrl = `https://${shopifyStoreDomain}/api/mcp`;

      yield* Effect.logInfo(`Executing MCP tool: ${toolName}`);

      const mcpResponse = yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch(mcpUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Store-Domain": shopifyStoreDomain,
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: toolName,
                arguments: toolArguments,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`MCP tool call failed: ${response.status}`);
          }

          const data = (await response.json()) as {
            result?: { content?: Array<{ text?: string }> };
          };
          return data.result?.content?.[0]?.text || null;
        },
        catch: (error) =>
          new AIProcessingError({
            reason: `MCP tool execution failed: ${error}`,
            conversationId: "unknown" as any,
            cause: error,
          }),
      });

      if (mcpResponse) {
        yield* Effect.logInfo("MCP tool execution successful");
        return mcpResponse;
      }

      return null;
    } catch (error) {
      yield* Effect.logWarning(`MCP tool execution error: ${error}`);
      return null;
    }
  });
}

// Humanize tool results using AI (from ConversationAgent.ts)
function humanizeToolResults(
  toolResults: Array<{ name: string; result: string }>,
  originalMessage: MessageContent,
  aiService: Ai
): Effect.Effect<string, AIProcessingError> {
  return Effect.gen(function* () {
    const humanizationPrompt = `You are helping humanize tool results for a customer. The customer asked: "${originalMessage}"

Tool results:
${toolResults.map((tr) => `${tr.name}: ${tr.result}`).join("\n\n")}

Create a natural, friendly response (2-3 sentences max) that answers the customer's question using this information. Be conversational and helpful.`;

    const humanizedResponse = yield* Effect.tryPromise({
      try: () =>
        aiService.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
          messages: [
            {
              role: "system",
              content:
                "You are a helpful customer service assistant. Provide natural, conversational responses based on the tool results.",
            },
            {
              role: "user",
              content: humanizationPrompt,
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      catch: (error) =>
        new AIProcessingError({
          reason: `Humanization failed: ${error}`,
          conversationId: "unknown" as any,
          cause: error,
        }),
    });

    const humanizedText = String(
      (humanizedResponse as any).response ||
        (humanizedResponse as any).choices?.[0]?.message?.content ||
        humanizedResponse
    );

    return (
      humanizedText ||
      "I found some information for you, but I'm having trouble formatting it right now."
    );
  });
}
