import { Context, Effect } from "effect";
import type {
  ProductSearchResult,
  PolicySearchResult,
  CartResult,
  CartItem,
  CartId,
  ShopifyMCPError,
  MCPConnectionError,
  MCPValidationError,
} from "./models";

// Abstract service interface using Context.Tag pattern
export abstract class ShopifyMCPService extends Context.Tag(
  "ShopifyMCPService"
)<
  ShopifyMCPService,
  {
    readonly searchCatalog: (
      query: string,
      context?: string
    ) => Effect.Effect<
      ProductSearchResult[],
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly searchPolicies: (
      query: string,
      context?: string
    ) => Effect.Effect<
      PolicySearchResult,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly getCart: (
      cartId?: CartId
    ) => Effect.Effect<
      CartResult,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly updateCart: (
      cartId: CartId | null,
      lines: CartItem[]
    ) => Effect.Effect<
      CartResult,
      ShopifyMCPError | MCPConnectionError | MCPValidationError
    >;

    readonly healthCheck: () => Effect.Effect<
      boolean,
      ShopifyMCPError | MCPConnectionError
    >;
  }
>() {}
