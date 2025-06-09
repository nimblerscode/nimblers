import { Effect, Layer, Context, Schema as S } from "effect";
import { ShopifyMCPService } from "@/domain/shopify/mcp/service";
import {
  type ShopifyMCPConfig,
  type CartResult,
  type CartItem,
  type CartId,
  ShopifyMCPConfigSchema,
  ProductSearchResultSchema,
  PolicySearchResultSchema,
  CartResultSchema,
  MCPRequestSchema,
  MCPResponseSchema,
  CatalogSearchRequestSchema,
  PolicySearchRequestSchema,
  CartUpdateRequestSchema,
  ShopifyMCPError,
  MCPConnectionError,
  MCPValidationError,
} from "@/domain/shopify/mcp/models";

// Configuration context tag
export const ShopifyMCPConfigService =
  Context.GenericTag<ShopifyMCPConfig>("ShopifyMCPConfig");

// Infrastructure implementation of the MCP service
export const ShopifyMCPServiceLive = Layer.effect(
  ShopifyMCPService,
  Effect.gen(function* () {
    const config = yield* ShopifyMCPConfigService;

    // Validate configuration
    const validatedConfig = yield* S.decodeUnknown(ShopifyMCPConfigSchema)(
      config
    ).pipe(
      Effect.mapError(
        (error) =>
          new MCPValidationError({
            message: `Invalid MCP configuration: ${error.message}`,
            cause: error,
          })
      )
    );

    const mcpEndpoint =
      validatedConfig.mcpEndpoint ||
      `https://${validatedConfig.storeDomain}/api/mcp`;

    // Helper function to make MCP requests following JSON-RPC 2.0 spec
    const makeRequest = <T>(
      method: string,
      params?: Record<string, unknown>
    ): Effect.Effect<
      T,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    > =>
      Effect.gen(function* () {
        // Create request payload
        const requestPayload = {
          jsonrpc: "2.0" as const,
          id: Math.random().toString(36).substring(2, 9),
          method,
          params,
        };

        // Validate request payload
        yield* S.decodeUnknown(MCPRequestSchema)(requestPayload).pipe(
          Effect.mapError(
            (error) =>
              new MCPValidationError({
                message: `Invalid request payload: ${error.message}`,
                cause: error,
              })
          )
        );

        // Make HTTP request
        const response = yield* Effect.tryPromise({
          try: async () => {
            const httpResponse = await fetch(mcpEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestPayload),
            });

            if (!httpResponse.ok) {
              throw new MCPConnectionError({
                message: `MCP request failed: ${httpResponse.status} ${httpResponse.statusText}`,
                storeDomain: validatedConfig.storeDomain,
                cause: {
                  status: httpResponse.status,
                  statusText: httpResponse.statusText,
                },
              });
            }

            return await httpResponse.json();
          },
          catch: (error) => {
            if (error instanceof MCPConnectionError) {
              return error;
            }
            return new MCPConnectionError({
              message: `Failed to connect to MCP server: ${
                error instanceof Error ? error.message : String(error)
              }`,
              storeDomain: validatedConfig.storeDomain,
              cause: error,
            });
          },
        });

        // Validate response structure
        const validatedResponse = yield* S.decodeUnknown(MCPResponseSchema)(
          response
        ).pipe(
          Effect.mapError(
            (error) =>
              new MCPValidationError({
                message: `Invalid MCP response: ${error.message}`,
                cause: error,
              })
          )
        );

        // Check for MCP errors
        if (validatedResponse.error) {
          yield* Effect.fail(
            new ShopifyMCPError({
              message: validatedResponse.error.message,
              code: validatedResponse.error.code,
              cause: validatedResponse.error.data,
            })
          );
        }

        return (validatedResponse.result || {}) as T;
      }).pipe(
        Effect.withSpan(`ShopifyMCP.${method}`, {
          attributes: {
            "mcp.method": method,
            "mcp.endpoint": mcpEndpoint,
            "mcp.storeDomain": validatedConfig.storeDomain,
          },
        })
      );

    return {
      searchCatalog: (query: string, context?: string) =>
        Effect.gen(function* () {
          // Validate input
          const validatedInput = yield* S.decodeUnknown(
            CatalogSearchRequestSchema
          )({
            query,
            context,
          }).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid catalog search input: ${error.message}`,
                  field: "query",
                  cause: error,
                })
            )
          );

          // Make MCP call
          const result = yield* makeRequest<{ content?: any[] }>("tools/call", {
            name: "search_shop_catalog",
            arguments: {
              query: validatedInput.query,
              context: validatedInput.context,
            },
          });

          // Parse the JSON response from MCP server
          const responseData = JSON.parse(
            result.content?.[0]?.text || '{"products":[]}'
          );

          // Transform raw result to typed result
          const products = (responseData.products || []).map((item: any) => {
            // Get the first variant for pricing and variant ID
            const firstVariant = item.variants?.[0];

            return {
              name: item.title || item.name || "Unknown Product",
              price: firstVariant?.price || item.price || "0.00",
              currency: firstVariant?.currency || item.currency || "USD",
              variantId:
                firstVariant?.variant_id ||
                item.variant_id ||
                item.id ||
                "unknown",
              productUrl: item.productUrl || item.url || "#",
              imageUrl: item.image_url || item.imageUrl || item.image,
              description: item.description,
            };
          });

          // Validate each product result
          return yield* Effect.forEach(
            products,
            (product) =>
              S.decodeUnknown(ProductSearchResultSchema)(product).pipe(
                Effect.mapError(
                  (error) =>
                    new MCPValidationError({
                      message: `Invalid product data: ${error.message}`,
                      cause: error,
                    })
                )
              ),
            { concurrency: "unbounded" }
          );
        }),

      searchPolicies: (query: string, context?: string) =>
        Effect.gen(function* () {
          // Validate input
          const validatedInput = yield* S.decodeUnknown(
            PolicySearchRequestSchema
          )({
            query,
            context,
          }).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid policy search input: ${error.message}`,
                  field: "query",
                  cause: error,
                })
            )
          );

          // Make MCP call
          const result = yield* makeRequest<{
            content?: any[];
            answer?: string;
            source?: string;
          }>("tools/call", {
            name: "search_shop_policies_and_faqs",
            arguments: {
              query: validatedInput.query,
              context: validatedInput.context,
            },
          });

          // Transform and validate result
          const policyResult = {
            answer:
              result.content?.[0]?.text || result.answer || "No answer found",
            source: result.source,
          };

          return yield* S.decodeUnknown(PolicySearchResultSchema)(
            policyResult
          ).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid policy response: ${error.message}`,
                  cause: error,
                })
            )
          );
        }),

      getCart: (cartId?: CartId) =>
        Effect.gen(function* () {
          // Make MCP call
          const result = yield* makeRequest<CartResult>("tools/call", {
            name: "get_cart",
            arguments: {
              cart_id: cartId,
            },
          });

          // Validate result
          return yield* S.decodeUnknown(CartResultSchema)(result).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid cart data: ${error.message}`,
                  cause: error,
                })
            )
          );
        }),

      updateCart: (cartId: CartId | null, lines: CartItem[]) =>
        Effect.gen(function* () {
          // Validate input
          const validatedInput = yield* S.decodeUnknown(
            CartUpdateRequestSchema
          )({
            cartId,
            lines,
          }).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid cart update input: ${error.message}`,
                  cause: error,
                })
            )
          );

          // Transform lines to MCP format
          const mcpLines = validatedInput.lines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            ...(line.lineItemId && { line_item_id: line.lineItemId }),
          }));

          // Make MCP call
          const result = yield* makeRequest<CartResult>("tools/call", {
            name: "update_cart",
            arguments: {
              cart_id: validatedInput.cartId,
              lines: mcpLines,
            },
          });

          // Validate result
          return yield* S.decodeUnknown(CartResultSchema)(result).pipe(
            Effect.mapError(
              (error) =>
                new MCPValidationError({
                  message: `Invalid cart update response: ${error.message}`,
                  cause: error,
                })
            )
          );
        }),

      healthCheck: () =>
        Effect.gen(function* () {
          // Simple health check by calling tools/list
          yield* makeRequest("tools/list");
          return true;
        }).pipe(
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("ShopifyMCP.healthCheck")
        ),
    };
  })
);

// Helper function to create a configuration layer
export const createShopifyMCPConfig = (config: ShopifyMCPConfig) =>
  Layer.succeed(ShopifyMCPConfigService, config);
