import { Effect, Context, Layer } from "effect";
import { ShopifyMCPService } from "@/domain/shopify/mcp/service";
import { ConversationId } from "@/domain/tenant/conversations/models";
import {
  type ProductSearchResult,
  type PolicySearchResult,
  type CartResult,
  type CartItem,
  ShopifyMCPError,
  MCPConnectionError,
  MCPValidationError,
} from "@/domain/shopify/mcp/models";

// Application service for conversation MCP interactions
export abstract class ConversationMCPService extends Context.Tag(
  "ConversationMCPService"
)<
  ConversationMCPService,
  {
    readonly processMessage: (
      conversationId: ConversationId,
      message: string,
      context?: string
    ) => Effect.Effect<
      ConversationMCPResponse,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly searchProducts: (
      conversationId: ConversationId,
      query: string,
      context?: string
    ) => Effect.Effect<
      ProductSearchResult[],
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly answerPolicyQuestion: (
      conversationId: ConversationId,
      question: string,
      context?: string
    ) => Effect.Effect<
      PolicySearchResult,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly manageCart: (
      conversationId: ConversationId,
      action: CartAction
    ) => Effect.Effect<
      CartResult,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;
  }
>() {}

// Types for conversation MCP responses
export interface ConversationMCPResponse {
  type: "product_search" | "policy_answer" | "cart_action" | "general_response";
  message: string;
  data?: ProductSearchResult[] | PolicySearchResult | CartResult;
  actions?: SuggestedAction[];
}

export interface SuggestedAction {
  type: "add_to_cart" | "view_product" | "get_policy" | "checkout";
  label: string;
  data: Record<string, unknown>;
}

export interface CartAction {
  type: "get" | "add" | "remove" | "clear";
  items?: CartItem[];
  cartId?: string;
}

// Implementation of the conversation MCP service
export const ConversationMCPServiceLive = Layer.effect(
  ConversationMCPService,
  Effect.gen(function* () {
    const mcpService = yield* ShopifyMCPService;

    // Helper to analyze message intent
    const analyzeIntent = (message: string): MessageIntent => {
      const lowerMessage = message.toLowerCase();

      // Product search patterns
      if (
        lowerMessage.includes("show") ||
        lowerMessage.includes("find") ||
        lowerMessage.includes("search") ||
        lowerMessage.includes("looking for") ||
        lowerMessage.includes("product")
      ) {
        return { type: "product_search", confidence: 0.8 };
      }

      // Policy/FAQ patterns
      if (
        lowerMessage.includes("policy") ||
        lowerMessage.includes("return") ||
        lowerMessage.includes("shipping") ||
        lowerMessage.includes("refund") ||
        lowerMessage.includes("help") ||
        lowerMessage.includes("question")
      ) {
        return { type: "policy_question", confidence: 0.8 };
      }

      // Cart patterns
      if (
        lowerMessage.includes("cart") ||
        lowerMessage.includes("add to cart") ||
        lowerMessage.includes("buy") ||
        lowerMessage.includes("purchase") ||
        lowerMessage.includes("checkout")
      ) {
        return { type: "cart_action", confidence: 0.7 };
      }

      return { type: "general", confidence: 0.5 };
    };

    return {
      processMessage: (
        conversationId: ConversationId,
        message: string,
        context?: string
      ) =>
        Effect.gen(function* () {
          const intent = analyzeIntent(message);

          switch (intent.type) {
            case "product_search": {
              const products = yield* mcpService.searchCatalog(
                message,
                context
              );

              if (products.length === 0) {
                return {
                  type: "general_response" as const,
                  message:
                    "I couldn't find any products matching your search. Could you try different keywords?",
                };
              }

              const responseMessage =
                products.length === 1
                  ? `I found this product for you: ${products[0].name} - ${products[0].price} ${products[0].currency}`
                  : `I found ${products.length} products matching your search. Here are the top results:`;

              const actions: SuggestedAction[] = products
                .slice(0, 3)
                .map((product) => ({
                  type: "add_to_cart" as const,
                  label: `Add ${product.name} to cart`,
                  data: { variantId: product.variantId, quantity: 1 },
                }));

              return {
                type: "product_search" as const,
                message: responseMessage,
                data: products,
                actions,
              };
            }

            case "policy_question": {
              const policyAnswer = yield* mcpService.searchPolicies(
                message,
                context
              );

              return {
                type: "policy_answer" as const,
                message: policyAnswer.answer,
                data: policyAnswer,
              };
            }

            case "cart_action": {
              // For now, just get the current cart
              const cart = yield* mcpService.getCart();

              const itemCount = cart.lines.length;
              const responseMessage =
                itemCount === 0
                  ? "Your cart is currently empty. Would you like me to help you find some products?"
                  : `You have ${itemCount} item${
                      itemCount > 1 ? "s" : ""
                    } in your cart.`;

              const actions: SuggestedAction[] =
                itemCount > 0
                  ? [
                      {
                        type: "checkout" as const,
                        label: "Proceed to checkout",
                        data: { cartId: cart.id },
                      },
                    ]
                  : [];

              return {
                type: "cart_action" as const,
                message: responseMessage,
                data: cart,
                actions,
              };
            }

            default: {
              // Try policy search as fallback for general questions
              const policyAnswer = yield* mcpService
                .searchPolicies(message, context)
                .pipe(
                  Effect.catchAll(() =>
                    Effect.succeed({
                      answer:
                        "I'm here to help you find products and answer questions about our store. What can I help you with today?",
                      source: undefined,
                    })
                  )
                );

              return {
                type: "general_response" as const,
                message: policyAnswer.answer,
                data: policyAnswer,
              };
            }
          }
        }).pipe(
          Effect.withSpan("ConversationMCP.processMessage", {
            attributes: {
              "conversation.id": conversationId,
              "message.intent": intent.type,
              "message.confidence": intent.confidence,
            },
          })
        ),

      searchProducts: (
        conversationId: ConversationId,
        query: string,
        context?: string
      ) =>
        mcpService.searchCatalog(query, context).pipe(
          Effect.withSpan("ConversationMCP.searchProducts", {
            attributes: {
              "conversation.id": conversationId,
              "search.query": query,
            },
          })
        ),

      answerPolicyQuestion: (
        conversationId: ConversationId,
        question: string,
        context?: string
      ) =>
        mcpService.searchPolicies(question, context).pipe(
          Effect.withSpan("ConversationMCP.answerPolicyQuestion", {
            attributes: {
              "conversation.id": conversationId,
              "policy.question": question,
            },
          })
        ),

      manageCart: (conversationId: ConversationId, action: CartAction) =>
        Effect.gen(function* () {
          switch (action.type) {
            case "get":
              return yield* mcpService.getCart(action.cartId);

            case "add":
              if (!action.items || action.items.length === 0) {
                yield* Effect.fail(
                  new MCPValidationError({
                    message: "No items provided for cart addition",
                    field: "items",
                  })
                );
              }
              return yield* mcpService.updateCart(
                action.cartId || null,
                action.items!
              );

            case "remove":
              // Remove items by setting quantity to 0
              if (!action.items || action.items.length === 0) {
                yield* Effect.fail(
                  new MCPValidationError({
                    message: "No items provided for cart removal",
                    field: "items",
                  })
                );
              }
              const removeItems = action.items!.map((item) => ({
                ...item,
                quantity: 0,
              }));
              return yield* mcpService.updateCart(
                action.cartId || null,
                removeItems
              );

            case "clear":
              // Clear by updating with empty cart
              return yield* mcpService.updateCart(action.cartId || null, []);

            default:
              yield* Effect.fail(
                new MCPValidationError({
                  message: `Unknown cart action: ${(action as any).type}`,
                  field: "action.type",
                })
              );
          }
        }).pipe(
          Effect.withSpan("ConversationMCP.manageCart", {
            attributes: {
              "conversation.id": conversationId,
              "cart.action": action.type,
            },
          })
        ),
    };
  })
);

// Helper types
interface MessageIntent {
  type: "product_search" | "policy_question" | "cart_action" | "general";
  confidence: number;
}
