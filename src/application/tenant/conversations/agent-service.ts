import { Context, Effect, Layer } from "effect";
import { getAgentByName, AgentNamespace } from "agents";
import {
  ConversationAgentService,
  AgentProcessMessageRequest,
  AgentProcessMessageResponse,
  AgentProcessMessageError,
} from "@/domain/tenant/conversations/agent-service";
import { ConversationAgent } from "@/infrastructure/cloudflare/agents/ConversationAgent";

// Agent namespace binding - this will be injected from the environment
export abstract class ConversationAgentNamespace extends Context.Tag(
  "@core/ConversationAgentNamespace"
)<ConversationAgentNamespace, AgentNamespace<ConversationAgent>>() {}

export const ConversationAgentServiceLive = Layer.effect(
  ConversationAgentService,
  Effect.gen(function* () {
    const agentNamespace = yield* ConversationAgentNamespace;

    return {
      processMessage: (request: AgentProcessMessageRequest) =>
        Effect.gen(function* () {
          yield* Effect.logInfo("Processing message with ConversationAgent", {
            conversationId: request.conversationId,
            organizationSlug: request.organizationSlug,
            shopifyStoreDomain: request.shopifyStoreDomain,
          });

          // Get or create agent instance based on conversation ID
          // Use getAgentByName for direct method calls (JSRPC API)
          const response = yield* Effect.tryPromise({
            try: async () => {
              // Get agent instance using conversation ID for proper isolation
              const agent = await getAgentByName(
                agentNamespace,
                request.conversationId
              );

              // Call the processMessage method directly on the Agent
              // No HTTP serialization needed - direct method call via JSRPC
              const result = await agent.processMessage(request);
              return result;
            },
            catch: (error) =>
              new AgentProcessMessageError({
                reason: `Failed to communicate with agent: ${error}`,
                conversationId: request.conversationId,
              }),
          });

          yield* Effect.logInfo("Agent response received", {
            conversationId: response.conversationId,
            messageId: response.messageId,
            responseLength: response.responseMessage.length,
          });

          return response;
        }).pipe(Effect.withSpan("ConversationAgentService.processMessage")),
    };
  })
);
