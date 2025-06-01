import { Effect, Layer } from "effect";
import {
  GlobalShopConnectionRepo,
  GlobalShopConnectionUseCase,
  OrgD1Service,
} from "@/domain/global/organization/service";
import {
  type NewShopConnection,
  type OrganizationSlug,
  ShopAlreadyConnectedError,
  ShopConnectionError,
  type ShopDomain,
} from "@/domain/global/organization/models";

export const GlobalShopConnectionUseCaseLive = Layer.effect(
  GlobalShopConnectionUseCase,
  Effect.gen(function* () {
    const repo = yield* GlobalShopConnectionRepo;
    const orgService = yield* OrgD1Service;

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

          if (existingConnection) {
            // Check if it's being connected to the same organization
            if (
              existingConnection.organizationSlug ===
              connection.organizationSlug
            ) {
              // Shop is already connected to the same organization
              return existingConnection;
            }

            // Shop is connected to a different organization
            return yield* Effect.fail(
              new ShopAlreadyConnectedError({
                message: `Shop '${connection.shopDomain}' is already connected to organization '${existingConnection.organizationSlug}'`,
                shopDomain: connection.shopDomain,
                connectedToOrganization: existingConnection.organizationSlug,
              })
            );
          }

          // Create new connection since no existing connection was found
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

      getOrganizationShops: (organizationSlug: OrganizationSlug) =>
        Effect.gen(function* () {
          const shops = yield* repo
            .getByOrganizationSlug(organizationSlug)
            .pipe(
              Effect.mapError(
                (error) =>
                  new ShopConnectionError({
                    message: `Failed to get organization shops: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
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
