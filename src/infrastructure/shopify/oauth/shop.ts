import { Effect, Layer, Schema as S } from "effect";
import {
  InvalidShopDomainError,
  ShopDomain,
} from "@/domain/global/shopify/oauth/models";
import { ShopValidator } from "@/domain/global/shopify/oauth/service";

export const ShopValidatorLive = Layer.effect(
  ShopValidator,
  Effect.gen(function* () {
    return {
      validateShopDomain: (shop: string) =>
        Effect.gen(function* () {
          // Basic validation: must end with .myshopify.com
          if (!shop.endsWith(".myshopify.com")) {
            return yield* Effect.fail(
              new InvalidShopDomainError({
                message: "Shop domain must end with .myshopify.com",
                shop,
              }),
            );
          }

          // Validate using schema
          const validatedShop = yield* S.decodeUnknown(ShopDomain)(shop).pipe(
            Effect.mapError(
              (error) =>
                new InvalidShopDomainError({
                  message: "Invalid shop domain format",
                  shop,
                }),
            ),
          );

          return validatedShop;
        }).pipe(Effect.withSpan("ShopValidator.validateShopDomain")),
    };
  }),
);
