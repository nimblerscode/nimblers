import { Effect, Layer, Option } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import {
  InvalidStateParameterError,
  MissingOrganizationError,
  MissingShopParameterError,
} from "@/domain/shopify/validation/models";
import { ShopifyValidationService } from "@/domain/shopify/validation/service";

export const ShopifyValidationServiceLive = Layer.succeed(
  ShopifyValidationService,
  {
    validateOrganizationParameter: (url: URL) =>
      Effect.gen(function* () {
        const orgSlug = url.searchParams.get("org") as OrganizationSlug;
        if (!orgSlug) {
          yield* Effect.fail(new MissingOrganizationError());
        }
        return orgSlug;
      }),

    validateShopParameter: (url: URL) =>
      Effect.gen(function* () {
        const shop = url.searchParams.get("shop") as ShopDomain;
        if (!shop) {
          yield* Effect.fail(new MissingShopParameterError());
        }
        return shop;
      }),

    extractOrganizationFromState: (state: string) =>
      Effect.gen(function* () {
        if (!state.includes("_org_")) {
          yield* Effect.fail(
            new InvalidStateParameterError({
              message: "Invalid state parameter format - missing _org_ marker",
              state,
            }),
          );
        }

        const orgSlug = state.split("_org_")[0] as OrganizationSlug;
        if (!orgSlug) {
          yield* Effect.fail(
            new InvalidStateParameterError({
              message: "Organization slug not found in state parameter",
              state,
            }),
          );
        }

        return orgSlug;
      }),

    validateRequiredOAuthParams: (
      shop: Option.Option<ShopDomain>,
      state: Option.Option<string>,
    ) =>
      Effect.gen(function* () {
        const shopValue = yield* Option.match(shop, {
          onNone: () =>
            Effect.fail(
              new MissingShopParameterError({
                message: "Missing required OAuth parameters: shop is required",
              }),
            ),
          onSome: (value) => Effect.succeed(value),
        });

        const stateValue = yield* Option.match(state, {
          onNone: () =>
            Effect.fail(
              new MissingShopParameterError({
                message: "Missing required OAuth parameters: state is required",
              }),
            ),
          onSome: (value) => Effect.succeed(value),
        });

        return {
          shop: shopValue,
          state: stateValue,
        };
      }),
  },
);
