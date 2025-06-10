import { Effect, Layer } from "effect";
import {
  AIIntentService,
  AIClassificationError,
  IntentClassificationResult,
  type IntentClassificationResultType,
} from "@/domain/global/ai/service";
import { AnthropicService } from "./client";

// Anthropic implementation of the intent classification service
export const AnthropicIntentServiceLive = Layer.effect(
  AIIntentService,
  Effect.gen(function* () {
    const anthropicService = yield* AnthropicService;

    return {
      classifyIntent: (message: string, context?: string) =>
        Effect.gen(function* () {
          // Create a prompt for intent classification with JSON output
          const prompt = `Analyze the following customer message and classify it into one of these intents:

1. "product_search" - Customer is looking for products, asking about specific items, or wants to browse
2. "policy_question" - Customer asking about store policies, returns, shipping, refunds, or general help
3. "cart_action" - Customer wants to manage their cart, checkout, or purchase items
4. "general" - General conversation, greetings, or unclear intent

Message: "${message}"
${context ? `Context: ${context}` : ""}

Respond only with a JSON object like:
{ "intent": "product_search", "confidence": 0.85 }`;

          try {
            console.log("🤖 ANTHROPIC INTENT CLASSIFICATION START", {
              message,
              context,
              prompt: prompt.substring(0, 200) + "...",
            });

            const systemPrompt =
              'You are an expert at classifying customer service messages. Always respond only with a JSON object like:\n{ "intent": "product_search", "confidence": 0.85 }';

            // Use Anthropic service for classification
            const response = yield* anthropicService
              .processMessage({
                messages: [
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
                systemPrompt,
              })
              .pipe(
                Effect.mapError(
                  (error) =>
                    new AIClassificationError({
                      message: `Anthropic classification failed: ${error}`,
                      cause: error,
                    })
                )
              );

            // Parse the response as JSON
            const textContent =
              response.content.find((c: any) => c.type === "text")?.text || "";
            console.log("🤖 ANTHROPIC RAW RESPONSE", {
              text: textContent,
              fullResponse: response,
            });

            let intent = "general";
            let confidence = 0.5;
            try {
              const parsed = JSON.parse(textContent);
              console.log("🤖 ANTHROPIC PARSED JSON", { parsed });

              const validIntents = [
                "product_search",
                "policy_question",
                "cart_action",
                "general",
              ];
              intent = validIntents.includes(parsed.intent)
                ? parsed.intent
                : "general";
              confidence = Math.max(
                0,
                Math.min(1, parseFloat(parsed.confidence))
              );

              console.log("🤖 ANTHROPIC VALIDATED RESULT", {
                intent,
                confidence,
              });
            } catch (parseError) {
              console.log("🚨 ANTHROPIC JSON PARSING FAILED", {
                text: textContent,
                parseError: String(parseError),
              });
              return {
                intent: "general" as const,
                confidence: 0.5,
                reasoning: "Failed to parse Anthropic response",
              };
            }

            const result = new IntentClassificationResult({
              intent: intent as IntentClassificationResultType["intent"],
              confidence,
              reasoning: `Anthropic classified as: ${intent} with confidence ${confidence}`,
            });

            console.log("🤖 FINAL ANTHROPIC CLASSIFICATION SUCCESS", {
              intent: result.intent,
              confidence: result.confidence,
              reasoning: result.reasoning,
            });

            return result;
          } catch (error) {
            console.log("🚨 ANTHROPIC CLASSIFICATION FAILED - USING FALLBACK", {
              error: String(error),
              message,
            });

            // Fallback classification using simple patterns
            const lowerMessage = message.toLowerCase();

            if (
              lowerMessage.includes("product") ||
              lowerMessage.includes("find") ||
              lowerMessage.includes("search") ||
              lowerMessage.includes("show me") ||
              lowerMessage.includes("do you have") ||
              lowerMessage.includes("looking for") ||
              lowerMessage.includes("need") ||
              lowerMessage.includes("want") ||
              lowerMessage.includes("sofa") ||
              lowerMessage.includes("candle") ||
              lowerMessage.includes("table") ||
              lowerMessage.includes("chair") ||
              lowerMessage.includes("furniture") ||
              lowerMessage.includes("available")
            ) {
              return new IntentClassificationResult({
                intent: "product_search" as const,
                confidence: 0.6,
                reasoning: "Fallback pattern matching",
              });
            }

            if (
              lowerMessage.includes("policy") ||
              lowerMessage.includes("return") ||
              lowerMessage.includes("help")
            ) {
              return new IntentClassificationResult({
                intent: "policy_question" as const,
                confidence: 0.6,
                reasoning: "Fallback pattern matching",
              });
            }

            return new IntentClassificationResult({
              intent: "general" as const,
              confidence: 0.5,
              reasoning: "Fallback - no clear pattern",
            });
          }
        }),
    };
  })
);
