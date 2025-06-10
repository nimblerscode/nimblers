import { Effect, Schema, Data, Context, Layer } from "effect";

// MCP JSON-RPC 2.0 Schema Definitions
const MCPRequestSchema = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Union(Schema.Number, Schema.String),
  method: Schema.String,
  params: Schema.optional(Schema.Unknown),
});

const MCPResponseSchema = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Union(Schema.Number, Schema.String),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(
    Schema.Struct({
      code: Schema.Number,
      message: Schema.String,
      data: Schema.optional(Schema.Unknown),
    })
  ),
});

// Branded types for type safety
type MCPRequestId = string | number;
type MCPRequest = Schema.Schema.Type<typeof MCPRequestSchema>;
type MCPResponse = Schema.Schema.Type<typeof MCPResponseSchema>;

// Error types using Effect-TS Data.TaggedError
export class MCPError extends Data.TaggedError("MCPError")<{
  code: number;
  message: string;
  data?: unknown;
}> {}

export class MCPToolNotFoundError extends Data.TaggedError(
  "MCPToolNotFoundError"
)<{
  toolName: string;
}> {}

export class MCPInvalidParamsError extends Data.TaggedError(
  "MCPInvalidParamsError"
)<{
  reason: string;
}> {}

// Tool handler interface with better typing
export interface ToolHandler {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Schema.Schema<any, any>;
  readonly execute: (args: unknown) => Effect.Effect<string, MCPError>;
}

// Server configuration
export interface MCPServerConfig {
  readonly serverInfo: {
    readonly name: string;
    readonly version: string;
    readonly description: string;
  };
  readonly protocolVersion?: string;
  readonly capabilities?: {
    readonly tools?: Record<string, unknown>;
    readonly resources?: Record<string, unknown>;
    readonly prompts?: Record<string, unknown>;
  };
}

// MCP Server service interface
export abstract class MCPServerService extends Context.Tag(
  "@infrastructure/MCPServerService"
)<
  MCPServerService,
  {
    readonly handleRequest: (
      request: unknown
    ) => Effect.Effect<MCPResponse, MCPError>;
    readonly registerTool: (handler: ToolHandler) => Effect.Effect<void, never>;
    readonly registerTools: (
      handlers: ToolHandler[]
    ) => Effect.Effect<void, never>;
    readonly getRegisteredTools: () => Effect.Effect<
      readonly ToolHandler[],
      never
    >;
  }
>() {}

/**
 * Enhanced MCP Server Implementation
 *
 * Features:
 * - Full Effect-TS integration
 * - Type-safe request/response handling
 * - Schema validation
 * - Structured error handling
 * - Proper logging with spans
 * - Resource management
 */
class MCPServerImpl {
  private toolHandlers: Map<string, ToolHandler> = new Map();

  constructor(private config: MCPServerConfig) {}

  /**
   * Register a tool handler with validation
   */
  registerTool(handler: ToolHandler): Effect.Effect<void, never> {
    const self = this;
    return Effect.gen(function* () {
      if (self.toolHandlers.has(handler.name)) {
        yield* Effect.logWarning(
          `Tool ${handler.name} already registered, overwriting`
        );
      }

      self.toolHandlers.set(handler.name, handler);
      yield* Effect.logInfo(`Registered MCP tool: ${handler.name}`);
    }).pipe(
      Effect.withSpan("MCPServer.registerTool", {
        attributes: { toolName: handler.name },
      })
    );
  }

  /**
   * Register multiple tools
   */
  registerTools(handlers: ToolHandler[]): Effect.Effect<void, never> {
    const self = this;
    return Effect.gen(function* () {
      for (const handler of handlers) {
        yield* self.registerTool(handler);
      }
    }).pipe(
      Effect.withSpan("MCPServer.registerTools", {
        attributes: { toolCount: handlers.length },
      })
    );
  }

  /**
   * Get registered tools
   */
  getRegisteredTools(): Effect.Effect<readonly ToolHandler[], never> {
    return Effect.succeed(Array.from(this.toolHandlers.values()));
  }

  /**
   * Handle MCP requests with full validation and error handling
   */
  handleRequest(request: unknown): Effect.Effect<MCPResponse, MCPError> {
    const self = this;
    return Effect.gen(function* () {
      // Validate request structure
      const validatedRequest = yield* Schema.decodeUnknown(MCPRequestSchema)(
        request
      ).pipe(
        Effect.mapError(
          (error) =>
            new MCPInvalidParamsError({
              reason: `Invalid request format: ${error.message}`,
            })
        )
      );

      yield* Effect.logInfo("Handling MCP request", {
        method: validatedRequest.method,
        id: validatedRequest.id,
        hasParams: !!validatedRequest.params,
      });

      const response = yield* self.routeRequest(validatedRequest);

      return response;
    }).pipe(
      Effect.withSpan("MCPServer.handleRequest"),
      Effect.catchAll((error) =>
        Effect.succeed({
          jsonrpc: "2.0" as const,
          id:
            typeof request === "object" && request !== null && "id" in request
              ? (request.id as MCPRequestId)
              : 0,
          error: {
            code: error._tag === "MCPInvalidParamsError" ? -32602 : -32603,
            message:
              error._tag === "MCPInvalidParamsError"
                ? error.reason
                : "Internal error",
            data: error,
          },
        })
      )
    );
  }

  /**
   * Route request to appropriate handler
   */
  private routeRequest(
    request: MCPRequest
  ): Effect.Effect<MCPResponse, MCPError> {
    const self = this;
    return Effect.gen(function* () {
      switch (request.method) {
        case "initialize":
          return yield* self.handleInitialize(request);

        case "tools/list":
          return yield* self.handleToolsList(request);

        case "tools/call":
          return yield* self.handleToolCall(request);

        case "notifications/initialized":
          // Handle post-initialization notification
          return {
            jsonrpc: "2.0" as const,
            id: request.id,
            result: {},
          };

        default:
          yield* Effect.logWarning(`Unknown MCP method: ${request.method}`);
          return yield* Effect.fail(
            new MCPError({
              code: -32601,
              message: `Method not found: ${request.method}`,
            })
          );
      }
    }).pipe(
      Effect.withSpan("MCPServer.routeRequest", {
        attributes: { method: request.method },
      })
    );
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(
    request: MCPRequest
  ): Effect.Effect<MCPResponse, never> {
    const self = this;
    return Effect.gen(function* () {
      yield* Effect.logInfo("Initializing MCP server", {
        serverName: self.config.serverInfo.name,
        version: self.config.serverInfo.version,
      });

      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          protocolVersion: self.config.protocolVersion || "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
            ...self.config.capabilities,
          },
          serverInfo: self.config.serverInfo,
        },
      };
    }).pipe(Effect.withSpan("MCPServer.handleInitialize"));
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(
    request: MCPRequest
  ): Effect.Effect<MCPResponse, never> {
    const self = this;
    return Effect.gen(function* () {
      const tools = Array.from(self.toolHandlers.values()).map((handler) => ({
        name: handler.name,
        description: handler.description,
        inputSchema: Schema.encodedSchema(handler.inputSchema),
      }));

      yield* Effect.logInfo("Returning MCP tools list", {
        toolCount: tools.length,
        tools: tools.map((t) => t.name),
      });

      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: { tools },
      };
    }).pipe(Effect.withSpan("MCPServer.handleToolsList"));
  }

  /**
   * Handle tools/call request
   */
  private handleToolCall(
    request: MCPRequest
  ): Effect.Effect<MCPResponse, MCPError> {
    const self = this;
    return Effect.gen(function* () {
      const params = request.params as
        | { name?: string; arguments?: unknown }
        | undefined;

      if (!params?.name) {
        return yield* Effect.fail(
          new MCPError({
            code: -32602,
            message: "Tool name is required",
          })
        );
      }

      const handler = self.toolHandlers.get(params.name);
      if (!handler) {
        return yield* Effect.fail(
          new MCPError({
            code: -32601,
            message: `Tool not found: ${params.name}`,
          })
        );
      }

      yield* Effect.logInfo("Executing MCP tool", {
        toolName: params.name,
        hasArgs: !!params.arguments,
      });

      // Validate arguments against schema
      const validatedArgs = yield* Schema.decodeUnknown(handler.inputSchema)(
        params.arguments || {}
      ).pipe(
        Effect.mapError(
          (error) =>
            new MCPError({
              code: -32602,
              message: `Invalid tool arguments: ${error.message}`,
            })
        )
      );

      const result = yield* handler.execute(validatedArgs);

      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        },
      };
    }).pipe(
      Effect.withSpan("MCPServer.handleToolCall", {
        attributes: { toolName: (request.params as any)?.name },
      })
    );
  }
}

/**
 * Live implementation of MCP Server Service
 */
export const MCPServerServiceLive = (config: MCPServerConfig) =>
  Layer.effect(
    MCPServerService,
    Effect.gen(function* () {
      const server = new MCPServerImpl(config);

      return {
        handleRequest: (request: unknown) => server.handleRequest(request),
        registerTool: (handler: ToolHandler) => server.registerTool(handler),
        registerTools: (handlers: ToolHandler[]) =>
          server.registerTools(handlers),
        getRegisteredTools: () => server.getRegisteredTools(),
      };
    })
  );

/**
 * Factory function to create MCP server layer with tools
 */
export function createMCPServerLayer(
  config: MCPServerConfig,
  toolHandlers: ToolHandler[] = []
): Layer.Layer<MCPServerService, never> {
  return Layer.effect(
    MCPServerService,
    Effect.gen(function* () {
      const server = new MCPServerImpl(config);
      yield* server.registerTools(toolHandlers);

      return {
        handleRequest: (request: unknown) => server.handleRequest(request),
        registerTool: (handler: ToolHandler) => server.registerTool(handler),
        registerTools: (handlers: ToolHandler[]) =>
          server.registerTools(handlers),
        getRegisteredTools: () => server.getRegisteredTools(),
      };
    })
  );
}

// Utility function for creating tool handlers with validation
export function createToolHandler<I, A>(
  name: string,
  description: string,
  inputSchema: Schema.Schema<A, I>,
  execute: (args: A) => Effect.Effect<string, MCPError>
): ToolHandler {
  return {
    name,
    description,
    inputSchema,
    execute: (args: unknown) =>
      Schema.decodeUnknown(inputSchema)(args).pipe(
        Effect.flatMap(execute),
        Effect.mapError((error) =>
          error._tag === "MCPError"
            ? error
            : new MCPError({
                code: -32603,
                message: `Tool execution failed: ${String(error)}`,
                data: error,
              })
        )
      ),
  };
}

// Export types
export type { MCPRequest, MCPResponse, MCPRequestId };

// MCPServerConfig and ToolHandler are already exported as interfaces above
