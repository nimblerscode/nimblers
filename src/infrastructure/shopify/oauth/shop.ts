import { Effect, Layer, Schema as S } from "effect";
import {
  InvalidShopDomainError,
  ShopDomain,
} from "@/domain/shopify/oauth/models";
import { ShopValidator } from "@/domain/shopify/oauth/service";

export const ShopValidatorLive = Layer.effect(
  ShopValidator,
  Effect.gen(function* () {
    return {
      validateShopDomain: (shop: string) =>
        S.decodeUnknown(ShopDomain)(shop).pipe(
          Effect.mapError((parseError) => {
            // Extract meaningful error message from parse error
            const errorMessage =
              parseError.message || "Invalid shop domain format";

            // Create domain-specific error messages based on the validation failure
            let message = "Invalid shop domain format";

            if (!shop.includes(".myshopify.com")) {
              message = "Shop domain must end with .myshopify.com";
            } else if (shop === ".myshopify.com" || shop === "myshopify.com") {
              message = "Shop domain cannot be empty or just 'myshopify.com'";
            } else if (shop.includes(" ")) {
              message = "Shop domain cannot contain spaces";
            } else if (shop.startsWith("-") || shop.startsWith(".")) {
              message = "Shop domain cannot start with a hyphen or dot";
            } else if (shop.includes("://") || shop.includes("/")) {
              message = "Shop domain cannot contain protocol or paths";
            } else if (!shop.endsWith(".myshopify.com")) {
              message = "Shop domain must end with .myshopify.com";
            } else {
              message = "Shop domain contains invalid characters or format";
            }

            return new InvalidShopDomainError({
              message,
              shop,
            });
          }),
          Effect.withSpan("ShopValidator.validateShopDomain"),
        ),
    };
  }),
);
