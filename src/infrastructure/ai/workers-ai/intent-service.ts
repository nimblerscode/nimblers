import { Effect, Layer } from "effect";
import {
  AIIntentService,
  WorkersAI,
  AIClassificationError,
  IntentClassificationResult,
  type IntentClassificationResultType,
} from "@/domain/global/ai/service";

// Workers AI implementation
export const AIIntentServiceLive = Layer.effect(
  AIIntentService,
  Effect.gen(function* () {
    const ai = yield* WorkersAI;

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
            console.log("🤖 AI INTENT CLASSIFICATION START", {
              message,
              context,
              prompt: prompt.substring(0, 200) + "...",
            });

            // Use Workers AI text generation for classification
            const response = yield* Effect.tryPromise({
              try: () =>
                ai.run("@cf/meta/llama-3.1-8b-instruct", {
                  messages: [
                    {
                      role: "system",
                      content:
                        'You are an expert at classifying customer service messages. Always respond only with a JSON object like:\n{ "intent": "product_search", "confidence": 0.85 }',
                    },
                    {
                      role: "user",
                      content: prompt,
                    },
                  ],
                  max_tokens: 50,
                  temperature: 0.1, // Low temperature for consistent classification
                }),
              catch: (error) => {
                console.log("🚨 AI CLASSIFICATION ERROR", {
                  error: String(error),
                });
                return new AIClassificationError({
                  message: `AI classification failed: ${error}`,
                  cause: error,
                });
              },
            });

            // Parse the response as JSON
            const text = (response as any).response?.trim() || "";
            console.log("🤖 AI RAW RESPONSE", { text, fullResponse: response });

            let intent = "general";
            let confidence = 0.5;
            try {
              const parsed = JSON.parse(text);
              console.log("🤖 AI PARSED JSON", { parsed });

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

              console.log("🤖 AI VALIDATED RESULT", { intent, confidence });
            } catch (parseError) {
              console.log("🚨 AI JSON PARSING FAILED", {
                text,
                parseError: String(parseError),
              });
              return {
                intent: "general" as const,
                confidence: 0.5,
                reasoning: "Failed to parse AI response",
              };
            }

            const result = new IntentClassificationResult({
              intent: intent as IntentClassificationResultType["intent"],
              confidence,
              reasoning: `AI classified as: ${intent} with confidence ${confidence}`,
            });

            console.log("🤖 FINAL AI CLASSIFICATION SUCCESS", {
              intent: result.intent,
              confidence: result.confidence,
              reasoning: result.reasoning,
            });

            return result;
          } catch (error) {
            console.log("🚨 AI CLASSIFICATION FAILED - USING FALLBACK", {
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

            if (
              lowerMessage.includes("cart") ||
              lowerMessage.includes("buy") ||
              lowerMessage.includes("checkout")
            ) {
              return new IntentClassificationResult({
                intent: "cart_action" as const,
                confidence: 0.6,
                reasoning: "Fallback pattern matching",
              });
            }

            return new IntentClassificationResult({
              intent: "general" as const,
              confidence: 0.5,
              reasoning: "Fallback to general intent",
            });
          }
        }),
    };
  })
);
