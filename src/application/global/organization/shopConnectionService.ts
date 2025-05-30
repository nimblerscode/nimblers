import { Effect, Layer } from "effect";
import {
  GlobalShopConnectionRepo,
  GlobalShopConnectionUseCase,
} from "@/domain/global/organization/service";
import {
  type NewShopConnection,
  type OrganizationId,
  ShopAlreadyConnectedError,
  ShopConnectionError,
  type ShopDomain,
} from "@/domain/global/organization/models";

export const GlobalShopConnectionUseCaseLive = Layer.effect(
  GlobalShopConnectionUseCase,
  Effect.gen(function* () {
    const repo = yield* GlobalShopConnectionRepo;

    return {
      connectShop: (connection: NewShopConnection) =>
        Effect.gen(function* () {
          // First check if shop is already connected
          const existingConnection = yield* repo
            .getByShopDomain(connection.shopDomain)
            .pipe(
              Effect.mapError(
                (error) =>
                  new ShopConnectionError({
                    message: `Failed to check existing connection: ${error.message}`,
                    shopDomain: connection.shopDomain,
                    cause: error,
                  })
              )
            );

          if (
            existingConnection &&
            existingConnection.organizationId !== connection.organizationId
          ) {
            return yield* Effect.fail(
              new ShopAlreadyConnectedError({
                message: `Shop '${connection.shopDomain}' is already connected to organization '${existingConnection.organizationId}'`,
                shopDomain: connection.shopDomain,
                connectedToOrganization: existingConnection.organizationId,
              })
            );
          }

          // If already connected to the same org, update it
          if (
            existingConnection &&
            existingConnection.organizationId === connection.organizationId
          ) {
            // For now, return the existing connection
            // TODO: Implement update logic if needed
            return existingConnection;
          }

          // Create new connection
          const newConnection = yield* repo.create(connection).pipe(
            Effect.mapError(
              (error) =>
                new ShopConnectionError({
                  message: `Failed to create shop connection: ${error.message}`,
                  shopDomain: connection.shopDomain,
                  cause: error,
                })
            )
          );

          return newConnection;
        }),

      disconnectShop: (shopDomain: ShopDomain) =>
        Effect.gen(function* () {
          const result = yield* repo.deleteByShopDomain(shopDomain).pipe(
            Effect.mapError(
              (error) =>
                new ShopConnectionError({
                  message: `Failed to disconnect shop: ${error.message}`,
                  shopDomain,
                  cause: error,
                })
            )
          );

          return result;
        }),

      checkShopConnection: (shopDomain: ShopDomain) =>
        Effect.gen(function* () {
          const connection = yield* repo.getByShopDomain(shopDomain).pipe(
            Effect.mapError(
              (error) =>
                new ShopConnectionError({
                  message: `Failed to check shop connection: ${error.message}`,
                  shopDomain,
                  cause: error,
                })
            )
          );

          return connection;
        }),

      getOrganizationShops: (organizationId: OrganizationId) =>
        Effect.gen(function* () {
          const shops = yield* repo.getByOrganizationId(organizationId).pipe(
            Effect.mapError(
              (error) =>
                new ShopConnectionError({
                  message: `Failed to get organization shops: ${error.message}`,
                  shopDomain: "" as ShopDomain, // Not applicable here
                  cause: error,
                })
            )
          );

          return shops;
        }),
    };
  })
);
