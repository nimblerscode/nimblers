import { Context, Effect, Data, Schema } from "effect";

// Intent classification results schema
export class IntentClassificationResult extends Schema.Class<IntentClassificationResult>(
  "IntentClassificationResult"
)({
  intent: Schema.Literal(
    "product_search",
    "policy_question",
    "cart_action",
    "general"
  ),
  confidence: Schema.Number,
  reasoning: Schema.optional(Schema.String),
}) {}

// Error types following Effect pattern
export class AIClassificationError extends Data.TaggedError(
  "AIClassificationError"
)<{
  message: string;
  cause?: unknown;
}> {}

// Extract the type for use in the service
export type IntentClassificationResultType = Schema.Schema.Type<
  typeof IntentClassificationResult
>;

// AI binding context
export abstract class WorkersAI extends Context.Tag("@ai/WorkersAI")<
  WorkersAI,
  Ai
>() {}

// AI service for intent classification
export abstract class AIIntentService extends Context.Tag("@ai/IntentService")<
  AIIntentService,
  {
    readonly classifyIntent: (
      message: string,
      context?: string
    ) => Effect.Effect<IntentClassificationResultType, AIClassificationError>;
  }
>() {}
