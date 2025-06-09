import { Agent } from "agents";
import { Effect } from "effect";
import {
  unsafeConversationId,
  unsafeMessageId,
  unsafeMessageContent,
  unsafePhoneNumber,
  unsafeOrganizationSlug,
  unsafeExternalMessageId,
} from "@/domain/tenant/shared/branded-types";
import {
  AgentProcessMessageRequest,
  AgentProcessMessageResponse,
  AgentProcessMessageError,
} from "@/domain/tenant/conversations/agent-service";

// MCP integration through Agents native MCP support

interface Env {
  AI: Ai;
  [key: string]: any;
}

export interface ConversationAgentState {
  conversationId: string;
  organizationSlug: string;
  shopifyStoreDomain?: string;
  messageHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
}

// The Agent extends the Cloudflare Agents SDK Agent class
export class ConversationAgent extends Agent<Env, ConversationAgentState> {
  // Handle HTTP requests to this Agent
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/process-message" && request.method === "POST") {
        const data = (await request.json()) as {
          conversationId: string;
          customerPhone: string;
          storePhone: string;
          messageContent: string;
          externalMessageId: string;
          organizationSlug: string;
          shopifyStoreDomain?: string;
        };

        // Convert to proper branded types
        const processMessageRequest: AgentProcessMessageRequest = {
          conversationId: unsafeConversationId(data.conversationId),
          customerPhone: unsafePhoneNumber(data.customerPhone),
          storePhone: unsafePhoneNumber(data.storePhone),
          messageContent: unsafeMessageContent(data.messageContent),
          externalMessageId: unsafeExternalMessageId(data.externalMessageId),
          organizationSlug: unsafeOrganizationSlug(data.organizationSlug),
          shopifyStoreDomain: data.shopifyStoreDomain,
        };

        const result = await this.processMessage(processMessageRequest);
        return Response.json(result);
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("ConversationAgent.onRequest error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Core business logic following Effect-TS patterns
  async processMessage(
    request: AgentProcessMessageRequest
  ): Promise<AgentProcessMessageResponse> {
    const self = this;

    try {
      console.log("🔍 ConversationAgent.processMessage starting", {
        conversationId: request.conversationId,
        hasShopifyDomain: !!request.shopifyStoreDomain,
      });

      return await Effect.runPromise(
        Effect.gen(function* () {
          // Get or initialize conversation state
          console.log("🔍 Getting conversation state...");
          let state = self.state;
          if (!state || Object.keys(state).length === 0) {
            console.log("🔍 Initializing new conversation state");
            state = {
              conversationId: request.conversationId,
              organizationSlug: request.organizationSlug,
              shopifyStoreDomain: request.shopifyStoreDomain,
              messageHistory: [],
            };
            self.setState(state);
          }

          // Add user message to history - convert branded type to string for storage
          state.messageHistory.push({
            role: "user",
            content: String(request.messageContent),
            timestamp: Date.now(),
          });

          // Connect to MCP if Shopify store is available
          console.log("🔍 About to connect to MCP...");
          if (request.shopifyStoreDomain) {
            yield* self.connectToShopifyMCP(request.shopifyStoreDomain);
          }

          // Generate AI response with MCP integration
          console.log("🔍 About to generate AI response...");
          const aiResponse = yield* self.generateAIResponse(request, state);

          // Add assistant response to history
          state.messageHistory.push({
            role: "assistant",
            content: aiResponse,
            timestamp: Date.now(),
          });

          // Update state
          self.setState(state);

          // Create response
          const messageId = unsafeMessageId(crypto.randomUUID());

          return {
            responseMessage: unsafeMessageContent(aiResponse),
            messageId,
            conversationId: request.conversationId,
          } as AgentProcessMessageResponse;
        })
      );
    } catch (error) {
      console.error("🚨 ConversationAgent.processMessage failed:", error);
      throw error;
    }
  }

  // Connect to Shopify MCP server and enable native tool calling
  private connectToShopifyMCP(
    shopifyStoreDomain: string
  ): Effect.Effect<void, AgentProcessMessageError> {
    return Effect.gen(function* () {
      try {
        const mcpUrl = `https://${shopifyStoreDomain}/api/mcp`;

        yield* Effect.logInfo(`Connecting to Shopify MCP: ${mcpUrl}`);

        // Test connection and get available tools from Shopify MCP server
        yield* Effect.tryPromise({
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
              throw new Error(`MCP server responded with ${response.status}`);
            }

            const data = (await response.json()) as {
              result?: { tools?: any[] };
            };
            const tools = data.result?.tools || [];

            if (tools.length > 0) {
              console.log("Shopify MCP tools discovered", {
                domain: shopifyStoreDomain,
                toolCount: tools.length,
                availableTools: tools.map((t: any) => t.name).join(", "),
              });
            }

            return tools;
          },
          catch: (error) =>
            new AgentProcessMessageError({
              reason: `Failed to connect to MCP server: ${error}`,
              conversationId: unsafeConversationId("unknown"),
            }),
        });
      } catch (error) {
        yield* Effect.logWarning(`MCP connection failed: ${error}`);
        // Continue without MCP - graceful degradation
      }
    });
  }

  // Generate AI response with MCP tool calling capability
  private generateAIResponse(
    request: AgentProcessMessageRequest,
    state: ConversationAgentState
  ): Effect.Effect<string, AgentProcessMessageError> {
    const self = this;

    return Effect.gen(function* () {
      // Build conversation context
      const context = self.buildContextString(request);
      const userMessage = String(request.messageContent).toLowerCase();

      // Prepare messages for AI (fallback or non-product queries)
      const messages = [
        {
          role: "system" as const,
          content: `You are a helpful customer service assistant for an e-commerce store${
            request.shopifyStoreDomain ? ` (${request.shopifyStoreDomain})` : ""
          }.

${context}

CRITICAL INSTRUCTIONS FOR TOOL USAGE:
- You have access to function tools for searching products and policies
- When customers ask about products (candles, sofas, items, etc.), you MUST call the search_shop_catalog function/tool
- When customers ask about policies, shipping, returns, call the search_shop_policies_and_faqs function/tool  
- DO NOT respond with text that looks like JSON function calls
- DO NOT write {"function": "search_shop_catalog", "arguments": {...}}
- Instead, USE THE ACTUAL FUNCTION CALLING MECHANISM provided by the system
- The system will automatically convert your function calls to tool executions

RESPONSE GUIDELINES:
- For product questions: Call the search_shop_catalog tool, then provide a natural response based on the results
- For policy questions: Call the search_shop_policies_and_faqs tool, then provide a natural response
- Keep responses concise and SMS-friendly (under 300 characters when possible)
- Never make up product information - always use tool results
- If no tools are needed, provide helpful conversational responses

FUNCTION CALLING EXAMPLES:
User: "Show me sofas"
You should: Call search_shop_catalog function with {"query": "sofas", "context": "customer looking for sofas"}
NOT: Write '{"function": "search_shop_catalog", "arguments": {...}}'

User: "What's your return policy?"  
You should: Call search_shop_policies_and_faqs function with {"query": "return policy"}
NOT: Write JSON text

Remember: USE FUNCTION CALLS, NOT JSON TEXT RESPONSES`,
        },
        ...state.messageHistory.slice(-8).map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        // Add the current user message with explicit function calling instruction
        {
          role: "user" as const,
          content: `${String(request.messageContent)}

[INSTRUCTION: If this is about products, use the search_shop_catalog FUNCTION CALL (not JSON text). If about policies, use search_shop_policies_and_faqs FUNCTION CALL. Do not write JSON text responses.]`,
        },
      ];

      // Get available MCP tools dynamically from the server
      console.log("🔍 About to get MCP tools...");
      const tools = yield* self.getAvailableMCPTools(
        request.shopifyStoreDomain
      );
      console.log("🔍 Got MCP tools:", tools.length);
      if (tools.length > 0) {
        console.log(
          "🔍 Tool format sample:",
          JSON.stringify(tools[0], null, 2)
        );
      }

      // Call Workers AI without tools first to test basic functionality
      console.log("🔍 Calling Workers AI with", tools.length, "tools");
      const response = yield* Effect.tryPromise({
        try: () => {
          // Test without tools first
          const aiPayload: any = {
            messages,
            max_tokens: 500,
            temperature: 0.7,
          };

          // Add tools back since the format is working
          if (tools.length > 0) {
            console.log("🔍 Adding", tools.length, "tools to AI call");
            aiPayload.tools = tools;
          }

          return (self as any).env.AI.run(
            "@cf/meta/llama-3.1-8b-instruct",
            aiPayload
          );
        },
        catch: (error) =>
          new AgentProcessMessageError({
            reason: `AI call failed: ${error}`,
            conversationId: request.conversationId,
          }),
      });

      // DEBUG: Log the actual AI response structure
      console.log("🔍 AI response received:", {
        responseType: typeof response,
        hasToolCalls:
          typeof response === "object" &&
          response !== null &&
          "tool_calls" in response,
        toolCallsLength:
          typeof response === "object" &&
          response !== null &&
          "tool_calls" in response
            ? (response as any).tool_calls?.length
            : 0,
        hasResponse:
          typeof response === "object" &&
          response !== null &&
          "response" in response,
        responseKeys:
          typeof response === "object" && response !== null
            ? Object.keys(response)
            : [],
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

        // Collect all tool results
        const toolResults: Array<{ name: string; result: string }> = [];

        // Execute any tool calls via MCP server
        for (const toolCall of response.tool_calls) {
          console.log("🔍 Executing tool call:", {
            toolName: toolCall.function?.name || toolCall.name,
            hasArguments: !!(
              toolCall.function?.arguments || toolCall.arguments
            ),
          });

          if (request.shopifyStoreDomain) {
            const toolResult = yield* self.executeShopifyMCPTool(
              request.shopifyStoreDomain,
              toolCall.function?.name || toolCall.name,
              typeof toolCall.function?.arguments === "string"
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function?.arguments || toolCall.arguments,
              request.conversationId
            );

            if (toolResult) {
              console.log(
                "🔍 Tool execution returned result, length:",
                toolResult.length
              );
              console.log(
                "🔍 Tool result content (first 200 chars):",
                toolResult.substring(0, 200)
              );

              toolResults.push({
                name: toolCall.function?.name || toolCall.name,
                result: toolResult,
              });
            }
          }
        }

        // If we have tool results, humanize them with AI
        if (toolResults.length > 0) {
          console.log("🔍 Humanizing tool results with AI...");
          const humanizedResponse = yield* self.humanizeToolResults(
            toolResults,
            request,
            state
          );
          return humanizedResponse;
        }
      } else {
        console.log("🔍 No tool calls detected in AI response");
      }

      // Extract regular response safely
      if (
        typeof response === "object" &&
        response !== null &&
        "response" in response
      ) {
        const finalResponse = String(
          response.response || "I'm here to help! How can I assist you today?"
        );
        console.log("🔍 Regular AI response, length:", finalResponse.length);
        console.log(
          "🔍 Response content (first 200 chars):",
          finalResponse.substring(0, 200)
        );

        // Check if the response looks like a JSON function call that should have been a tool call
        if (
          finalResponse.trim().startsWith('{"function":') ||
          finalResponse.trim().startsWith('{"name":')
        ) {
          console.log(
            "🔍 Detected JSON function call in text response, attempting to parse and execute"
          );

          try {
            const parsedCall = JSON.parse(finalResponse);
            if (
              parsedCall.function &&
              parsedCall.arguments &&
              request.shopifyStoreDomain
            ) {
              console.log(
                "🔍 Manually executing tool call from JSON response:",
                {
                  toolName: parsedCall.function,
                  hasArguments: !!parsedCall.arguments,
                }
              );

              // Manually execute the tool call
              const toolResult = yield* self.executeShopifyMCPTool(
                request.shopifyStoreDomain,
                parsedCall.function,
                parsedCall.arguments,
                request.conversationId
              );

              if (toolResult) {
                console.log(
                  "🔍 Manual tool execution successful, humanizing result"
                );
                // Humanize the result
                const humanizedResponse = yield* self.humanizeToolResults(
                  [{ name: parsedCall.function, result: toolResult }],
                  request,
                  state
                );
                return humanizedResponse;
              }
            }
          } catch (parseError) {
            console.log("🔍 Failed to parse JSON function call:", parseError);
          }
        }

        return finalResponse;
      }

      const fallbackResponse = "I'm here to help! How can I assist you today?";
      console.log("🔍 Fallback response, length:", fallbackResponse.length);
      return fallbackResponse;
    });
  }

  // Get all available MCP tools from the server
  private getAvailableMCPTools(
    shopifyStoreDomain?: string
  ): Effect.Effect<any[], AgentProcessMessageError> {
    return Effect.gen(function* () {
      if (!shopifyStoreDomain) {
        return [];
      }

      try {
        const mcpUrl = `https://${shopifyStoreDomain}/api/mcp`;

        yield* Effect.logInfo("Fetching available MCP tools");

        // Get all available tools from MCP server
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
            console.log(
              "🔍 Raw MCP tool sample:",
              JSON.stringify(availableTools[0], null, 2)
            );

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
            new AgentProcessMessageError({
              reason: `Failed to fetch MCP tools: ${error}`,
              conversationId: unsafeConversationId("unknown"),
            }),
        });

        return tools;
      } catch (error) {
        yield* Effect.logWarning(`MCP tools fetch error: ${error}`);
        return [];
      }
    });
  }

  // Execute Shopify MCP tool calls
  private executeShopifyMCPTool(
    shopifyStoreDomain: string,
    toolName: string,
    toolArguments: any,
    conversationId: any
  ): Effect.Effect<string | null, AgentProcessMessageError> {
    return Effect.gen(function* () {
      try {
        const mcpUrl = `https://${shopifyStoreDomain}/api/mcp`;

        yield* Effect.logInfo(`Executing MCP tool: ${toolName}`);

        // Call Shopify MCP server with the tool request
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
            new AgentProcessMessageError({
              reason: `MCP tool execution failed: ${error}`,
              conversationId: conversationId,
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

  // Humanize tool results using AI
  private humanizeToolResults(
    toolResults: Array<{ name: string; result: string }>,
    request: AgentProcessMessageRequest,
    state: ConversationAgentState
  ): Effect.Effect<string, AgentProcessMessageError> {
    const self = this;

    return Effect.gen(function* () {
      // Build context for humanization
      const context = self.buildContextString(request);
      const userMessage = String(request.messageContent);

      // Create a summary of tool results
      const toolSummary = toolResults
        .map(({ name, result }) => `Tool: ${name}\nResult: ${result}`)
        .join("\n\n");

      // Messages for humanization
      const humanizationMessages = [
        {
          role: "system" as const,
          content: `You are a helpful customer service assistant for an e-commerce store${
            request.shopifyStoreDomain ? ` (${request.shopifyStoreDomain})` : ""
          }.

${context}

CRITICAL INSTRUCTIONS FOR RESPONSE HUMANIZATION:
- A customer asked: "${userMessage}"
- Tools were executed and returned the following raw data
- Your job is to convert this raw data into a natural, conversational SMS response
- Keep responses concise and SMS-friendly (under 300 characters when possible)
- Focus on the most relevant and helpful information for the customer
- Use natural language, not technical jargon
- If multiple products are found, highlight the top 2-3 most relevant ones
- Include prices and key details that would help the customer make a decision
- End with a helpful question or call-to-action when appropriate

Tool Results to Humanize:
${toolSummary}

Convert this raw tool data into a friendly, helpful response that directly answers the customer's question.`,
        },
        {
          role: "user" as const,
          content: `Please convert the tool results above into a natural, conversational response to this customer message: "${userMessage}"`,
        },
      ];

      // Call Workers AI to humanize the response
      console.log("🔍 Calling Workers AI for response humanization");
      const humanizationResponse = yield* Effect.tryPromise({
        try: () => {
          return (self as any).env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            messages: humanizationMessages,
            max_tokens: 400,
            temperature: 0.7,
          });
        },
        catch: (error) =>
          new AgentProcessMessageError({
            reason: `AI humanization failed: ${error}`,
            conversationId: request.conversationId,
          }),
      });

      // Extract the humanized response
      if (
        typeof humanizationResponse === "object" &&
        humanizationResponse !== null &&
        "response" in humanizationResponse
      ) {
        const humanizedText = String(
          humanizationResponse.response ||
            "I found some information for you. How can I help further?"
        );
        console.log("🔍 Humanized response:", humanizedText);
        return humanizedText;
      }

      // Fallback if humanization fails
      const fallbackResponse = `I found some information for you based on your inquiry about "${userMessage}". How can I help you further?`;
      console.log("🔍 Using fallback humanized response");
      return fallbackResponse;
    });
  }

  private buildContextString(request: AgentProcessMessageRequest): string {
    const parts = [];

    if (request.organizationSlug) {
      parts.push(`Organization: ${request.organizationSlug}`);
    }

    if (request.shopifyStoreDomain) {
      parts.push(`Store: ${request.shopifyStoreDomain}`);
    }

    if (request.conversationId) {
      parts.push(`Conversation: ${request.conversationId}`);
    }

    return parts.length > 0 ? parts.join(". ") + "." : "";
  }
}
