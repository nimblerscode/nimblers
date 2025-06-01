import { Context, type Effect, type Option } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import type {
  InvalidStateParameterError,
  MissingOrganizationError,
  MissingShopParameterError,
  ShopifyValidationError,
} from "./models";

// === Parameter Validation Service ===
export abstract class ShopifyValidationService extends Context.Tag(
  "@domain/shopify/validation/Service",
)<
  ShopifyValidationService,
  {
    readonly validateOrganizationParameter: (
      url: URL,
    ) => Effect.Effect<OrganizationSlug, MissingOrganizationError>;

    readonly validateShopParameter: (
      url: URL,
    ) => Effect.Effect<ShopDomain, MissingShopParameterError>;

    readonly extractOrganizationFromState: (
      state: string,
    ) => Effect.Effect<OrganizationSlug, InvalidStateParameterError>;

    readonly validateRequiredOAuthParams: (
      shop: Option.Option<ShopDomain>,
      state: Option.Option<string>,
    ) => Effect.Effect<
      { shop: ShopDomain; state: string },
      ShopifyValidationError
    >;
  }
>() {}
