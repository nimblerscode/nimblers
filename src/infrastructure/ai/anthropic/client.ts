import { Effect, Layer, Context } from "effect";
import { Anthropic } from "@anthropic-ai/sdk";

// Anthropic Configuration
export abstract class AnthropicConfig extends Context.Tag(
  "@ai/AnthropicConfig"
)<
  AnthropicConfig,
  {
    readonly apiKey: string;
    readonly model: string;
    readonly maxTokens: number;
    readonly temperature: number;
  }
>() {}

// Anthropic Client Service
export abstract class AnthropicClient extends Context.Tag(
  "@ai/AnthropicClient"
)<AnthropicClient, Anthropic>() {}

// Create Anthropic client layer
export const AnthropicClientLive = Layer.effect(
  AnthropicClient,
  Effect.gen(function* () {
    const config = yield* AnthropicConfig;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    yield* Effect.logInfo("Anthropic client initialized", {
      model: config.model,
      maxTokens: config.maxTokens,
    });

    return client;
  })
);

// Anthropic Service for conversations
export abstract class AnthropicService extends Context.Tag(
  "@ai/AnthropicService"
)<
  AnthropicService,
  {
    readonly processMessage: (params: {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      systemPrompt?: string;
      tools?: any[];
    }) => Effect.Effect<any, Error>;
    readonly processMessageWithMCP: (params: {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      systemPrompt?: string;
      mcpServerUrl: string;
      mcpServerName: string;
    }) => Effect.Effect<any, Error>;
  }
>() {}

// Anthropic service implementation
export const AnthropicServiceLive = Layer.effect(
  AnthropicService,
  Effect.gen(function* () {
    const client = yield* AnthropicClient;
    const config = yield* AnthropicConfig;

    return {
      processMessage: (params: {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        systemPrompt?: string;
        tools?: any[];
      }) =>
        Effect.gen(function* () {
          const { messages, systemPrompt, tools } = params;

          yield* Effect.logInfo("Anthropic processing message", {
            messageCount: messages.length,
            hasSystemPrompt: !!systemPrompt,
            hasTools: !!(tools && tools.length > 0),
            model: config.model,
          });

          const anthropicParams: any = {
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            messages,
          };

          if (systemPrompt) {
            anthropicParams.system = systemPrompt;
          }

          if (tools && tools.length > 0) {
            anthropicParams.tools = tools;
            yield* Effect.logInfo("Added tools to request", {
              toolCount: tools.length,
              toolNames: tools.map((t) => t.name),
            });
          }

          const response = yield* Effect.tryPromise({
            try: () => client.messages.create(anthropicParams),
            catch: (error) => new Error(`Anthropic API failed: ${error}`),
          });

          yield* Effect.logInfo("Anthropic response received", {
            hasToolUse: response.content.some((c) => c.type === "tool_use"),
            contentBlocks: response.content.length,
            stopReason: response.stop_reason,
          });

          return response;
        }),

      processMessageWithMCP: (params: {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        systemPrompt?: string;
        mcpServerUrl: string;
        mcpServerName: string;
      }) =>
        Effect.gen(function* () {
          const { messages, systemPrompt, mcpServerUrl, mcpServerName } =
            params;

          yield* Effect.logInfo(
            "Anthropic processing message with native MCP",
            {
              messageCount: messages.length,
              hasSystemPrompt: !!systemPrompt,
              mcpServerUrl,
              mcpServerName,
              model: config.model,
            }
          );

          const anthropicParams: any = {
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            messages,
            mcp_servers: [
              {
                type: "url",
                url: mcpServerUrl,
                name: mcpServerName,
              },
            ],
          };

          if (systemPrompt) {
            anthropicParams.system = systemPrompt;
          }

          // Add the required MCP beta header
          const clientWithHeaders = new Anthropic({
            apiKey: config.apiKey,
            defaultHeaders: {
              "anthropic-beta": "mcp-client-2025-04-04",
            },
          });

          const response = yield* Effect.tryPromise({
            try: () => clientWithHeaders.messages.create(anthropicParams),
            catch: (error) => new Error(`Anthropic MCP API failed: ${error}`),
          });

          yield* Effect.logInfo("Anthropic MCP response received", {
            hasToolUse: response.content.some(
              (c: any) => c.type === "tool_use" || c.type === "mcp_tool_use"
            ),
            contentBlocks: response.content.length,
            stopReason: response.stop_reason,
          });

          return response;
        }),
    };
  })
);

// Helper to create Anthropic configuration
export const createAnthropicConfig = (env: {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_MAX_TOKENS?: string;
  ANTHROPIC_TEMPERATURE?: string;
}) => {
  return Layer.succeed(AnthropicConfig, {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
    maxTokens: parseInt(env.ANTHROPIC_MAX_TOKENS || "1000"),
    temperature: parseFloat(env.ANTHROPIC_TEMPERATURE || "0.7"),
  });
};

// Complete Anthropic layer
export const AnthropicLayerLive = (env: {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_MAX_TOKENS?: string;
  ANTHROPIC_TEMPERATURE?: string;
}) => {
  const configLayer = createAnthropicConfig(env);
  const clientLayer = Layer.provide(AnthropicClientLive, configLayer);
  const serviceLayer = Layer.provide(
    AnthropicServiceLive,
    Layer.merge(configLayer, clientLayer)
  );

  return serviceLayer;
};
