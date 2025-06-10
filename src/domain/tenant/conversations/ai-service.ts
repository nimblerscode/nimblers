import { Context, Effect, Data, Schema } from "effect";
import {
  ConversationId,
  MessageContent,
  OrganizationSlug,
} from "@/domain/tenant/shared/branded-types";

// Domain errors for AI conversation processing
export class AIConversationError extends Data.TaggedError(
  "AIConversationError"
)<{
  reason: string;
  conversationId?: ConversationId;
  cause?: unknown;
}> {}

export class AIProcessingError extends Data.TaggedError("AIProcessingError")<{
  reason: string;
  conversationId: ConversationId;
  cause?: unknown;
}> {}

// Processing metadata schema
export const ProcessingMetadata = Schema.Struct({
  usedTools: Schema.Boolean,
  toolsExecuted: Schema.Array(Schema.String),
  responseLength: Schema.Number,
});

export type ProcessingMetadata = Schema.Schema.Type<typeof ProcessingMetadata>;

// Request schema
export const ProcessConversationMessageRequest = Schema.Struct({
  conversationId: ConversationId,
  messageContent: MessageContent,
  organizationSlug: OrganizationSlug,
  shopifyStoreDomain: Schema.String,
});

export type ProcessConversationMessageRequest = Schema.Schema.Type<
  typeof ProcessConversationMessageRequest
>;

// Response schema
export const ProcessConversationMessageResponse = Schema.Struct({
  responseMessage: MessageContent,
  conversationId: ConversationId,
  processingMetadata: Schema.optional(ProcessingMetadata),
});

export type ProcessConversationMessageResponse = Schema.Schema.Type<
  typeof ProcessConversationMessageResponse
>;

// Domain service interface for AI conversation processing
export abstract class ConversationAIService extends Context.Tag(
  "@core/ConversationAIService"
)<
  ConversationAIService,
  {
    readonly processMessage: (
      request: ProcessConversationMessageRequest
    ) => Effect.Effect<
      ProcessConversationMessageResponse,
      AIConversationError | AIProcessingError
    >;
  }
>() {}
