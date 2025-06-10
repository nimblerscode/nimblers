import { Effect, Layer, Context, Data, Schema } from "effect";

/**
 * MCP JSON-RPC 2.0 request/response types
 */
// MCP Error types
export class MCPConnectionError extends Data.TaggedError("MCPConnectionError")<{
  reason: string;
  endpoint?: string;
  cause?: unknown;
}> {}

export class MCPToolCallError extends Data.TaggedError("MCPToolCallError")<{
  toolName: string;
  reason: string;
  cause?: unknown;
}> {}

// MCP Schemas
export const MCPToolSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  input_schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

export const MCPRequestSchema = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Number,
  method: Schema.String,
  params: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
});

export const MCPResponseSchema = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Number,
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(
    Schema.Struct({
      code: Schema.Number,
      message: Schema.String,
      data: Schema.optional(Schema.Unknown),
    })
  ),
});

export const ToolCallParamsSchema = Schema.Struct({
  name: Schema.String,
  arguments: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

// Derived types from schemas
export type MCPTool = Schema.Schema.Type<typeof MCPToolSchema>;
export type MCPRequest = Schema.Schema.Type<typeof MCPRequestSchema>;
export type MCPResponse = Schema.Schema.Type<typeof MCPResponseSchema>;
export type ToolCallParams = Schema.Schema.Type<typeof ToolCallParamsSchema>;

// MCP Client Service Interface
export abstract class MCPClient extends Context.Tag("@ai/MCPClient")<
  MCPClient,
  {
    readonly listTools: (
      shopifyStoreDomain: string
    ) => Effect.Effect<MCPTool[], MCPConnectionError, never>;
    readonly callTool: (
      shopifyStoreDomain: string,
      params: ToolCallParams
    ) => Effect.Effect<string, MCPToolCallError, never>;
    readonly getAnthropicTools: (
      shopifyStoreDomain: string
    ) => Effect.Effect<any[], MCPConnectionError, never>;
  }
>() {}

/**
 * Simple MCP Client for Cloudflare Workers
 * Connects to MCP servers and handles tool calls for AI conversations
 */
export const MCPClientLive = Layer.succeed(MCPClient, {
  listTools: (shopifyStoreDomain: string) =>
    Effect.gen(function* () {
      const endpoint = `https://${shopifyStoreDomain}/api/mcp`;

      yield* Effect.logInfo("Connecting to MCP server", { endpoint });

      const response = yield* makeJsonRpcRequest(
        endpoint,
        "tools/list",
        {}
      ).pipe(
        Effect.mapError(
          (error) =>
            new MCPConnectionError({
              reason: `Failed to connect to MCP server: ${error}`,
              endpoint,
              cause: error,
            })
        )
      );

      const toolsData = (response.result as any)?.tools || [];
      const tools = yield* Effect.try({
        try: () => formatToolsData(toolsData),
        catch: (error) =>
          new MCPConnectionError({
            reason: `Failed to format tools data: ${error}`,
            endpoint,
            cause: error,
          }),
      });

      yield* Effect.logInfo("MCP tools loaded", {
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name),
      });

      return tools;
    }),

  callTool: (shopifyStoreDomain: string, params: ToolCallParams) =>
    Effect.gen(function* () {
      const endpoint = `https://${shopifyStoreDomain}/api/mcp`;

      yield* Effect.logInfo("Calling MCP tool", {
        toolName: params.name,
        args: params.arguments,
      });

      const response = yield* makeJsonRpcRequest(endpoint, "tools/call", {
        name: params.name,
        arguments: params.arguments,
      }).pipe(
        Effect.mapError(
          (error) =>
            new MCPToolCallError({
              toolName: params.name,
              reason: `Tool call failed: ${error}`,
              cause: error,
            })
        )
      );

      if (response.error) {
        return yield* Effect.fail(
          new MCPToolCallError({
            toolName: params.name,
            reason: `Tool returned error: ${response.error.message}`,
            cause: response.error,
          })
        );
      }

      yield* Effect.logInfo("MCP tool response received", {
        toolName: params.name,
        hasResult: !!response.result,
      });

      // Extract text content from tool result
      const result = response.result as any;
      if (result?.content && Array.isArray(result.content)) {
        const textContent = result.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");
        return textContent;
      }

      return result?.content?.[0]?.text || String(result || "");
    }),

  getAnthropicTools: (shopifyStoreDomain: string) =>
    Effect.gen(function* () {
      const tools = yield* makeJsonRpcRequest(
        `https://${shopifyStoreDomain}/api/mcp`,
        "tools/list",
        {}
      ).pipe(
        Effect.map((response) =>
          formatToolsData((response.result as any)?.tools || [])
        ),
        Effect.mapError(
          (error) =>
            new MCPConnectionError({
              reason: `Failed to get tools for Anthropic: ${error}`,
              endpoint: `https://${shopifyStoreDomain}/api/mcp`,
              cause: error,
            })
        )
      );

      // Format tools for Anthropic Claude
      const anthropicTools = tools.map((tool: MCPTool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));

      return anthropicTools;
    }),
});

// Helper function to make JSON-RPC requests
function makeJsonRpcRequest(
  endpoint: string,
  method: string,
  params: Record<string, unknown>
): Effect.Effect<MCPResponse, Error, never> {
  return Effect.gen(function* () {
    const requestBody: MCPRequest = {
      jsonrpc: "2.0",
      method,
      id: Date.now(),
      params,
    };

    const response = yield* Effect.tryPromise({
      try: async () => {
        const fetchResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          throw new Error(
            `MCP request failed: ${fetchResponse.status} ${errorText}`
          );
        }

        return await fetchResponse.json();
      },
      catch: (error) => new Error(`Network request failed: ${error}`),
    });

    return response as MCPResponse;
  });
}

// Helper function to format tools data
function formatToolsData(toolsData: unknown[]): MCPTool[] {
  return toolsData.map((tool: any) => ({
    name: tool.name || "",
    description: tool.description || "",
    input_schema: tool.inputSchema ||
      tool.input_schema || {
        type: "object",
        properties: {},
        required: [],
      },
  }));
}
