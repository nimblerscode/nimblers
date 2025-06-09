import { Context, Effect, Schema, Data } from "effect";
import {
  ConversationId,
  MessageId,
  ExternalMessageId,
  PhoneNumber,
  OrganizationSlug,
  MessageContent,
} from "@/domain/tenant/shared/branded-types";

// Domain errors
export class AgentProcessMessageError extends Data.TaggedError(
  "AgentProcessMessageError"
)<{
  reason: string;
  conversationId?: ConversationId;
}> {}

// Request/Response schemas using Effect Schema
export const AgentProcessMessageRequest = Schema.Struct({
  conversationId: ConversationId,
  customerPhone: PhoneNumber,
  storePhone: PhoneNumber,
  messageContent: MessageContent,
  externalMessageId: ExternalMessageId,
  organizationSlug: OrganizationSlug,
  shopifyStoreDomain: Schema.optional(Schema.String),
});

export type AgentProcessMessageRequest = Schema.Schema.Type<
  typeof AgentProcessMessageRequest
>;

export const AgentProcessMessageResponse = Schema.Struct({
  responseMessage: MessageContent,
  messageId: MessageId,
  conversationId: ConversationId,
});

export type AgentProcessMessageResponse = Schema.Schema.Type<
  typeof AgentProcessMessageResponse
>;

export abstract class ConversationAgentService extends Context.Tag(
  "@core/ConversationAgentService"
)<
  ConversationAgentService,
  {
    readonly processMessage: (
      request: AgentProcessMessageRequest
    ) => Effect.Effect<AgentProcessMessageResponse, AgentProcessMessageError>;
  }
>() {}
