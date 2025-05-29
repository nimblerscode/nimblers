import {
  AccessToken,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  Nonce,
  Scope,
  ShopDomain,
} from "@/domain/global/shopify/oauth/models";
import {
  AccessTokenService,
  NonceManager,
} from "@/domain/global/shopify/oauth/service";
import { DurableObjectState } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { AccessTokenRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/AccessTokenRepoLive";
import { DrizzleShopifyOAuthClientLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/drizzle";
import { NonceRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/NonceRepoLive";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSwagger,
  HttpServer,
} from "@effect/platform";
import { Effect, Layer, Schema } from "effect";

// Request/Response schemas
const NonceGenerateResponseSchema = Schema.Struct({
  nonce: Schema.String,
});

const NonceRequestSchema = Schema.Struct({
  nonce: Nonce,
});

const NonceVerifyResponseSchema = Schema.Struct({
  valid: Schema.Boolean,
});

const TokenStoreRequestSchema = Schema.Struct({
  shop: ShopDomain,
  accessToken: AccessToken,
  scope: Scope,
});

const TokenRetrieveResponseSchema = Schema.Struct({
  accessToken: Schema.NullOr(Schema.String),
  scope: Schema.optional(Schema.String),
});

const TokenDeleteRequestSchema = Schema.Struct({
  shop: ShopDomain,
});

const TokenDeleteResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  deleted: Schema.Boolean,
});

const TokenExchangeRequestSchema = Schema.Struct({
  shop: ShopDomain,
  code: AuthorizationCode,
  clientId: ClientId,
  clientSecret: ClientSecret,
});

// Define endpoints
const generateNonce = HttpApiEndpoint.post(
  "generateNonce",
  "/nonce/generate"
).addSuccess(NonceGenerateResponseSchema);

const storeNonce = HttpApiEndpoint.post("storeNonce", "/nonce/store")
  .setPayload(NonceRequestSchema)
  .addSuccess(Schema.Struct({ success: Schema.Boolean }));

const verifyNonce = HttpApiEndpoint.post("verifyNonce", "/nonce/verify")
  .setPayload(NonceRequestSchema)
  .addSuccess(NonceVerifyResponseSchema);

const consumeNonce = HttpApiEndpoint.post("consumeNonce", "/nonce/consume")
  .setPayload(NonceRequestSchema)
  .addSuccess(Schema.Struct({ success: Schema.Boolean }));

const storeAccessToken = HttpApiEndpoint.post(
  "storeAccessToken",
  "/token/store"
)
  .setPayload(TokenStoreRequestSchema)
  .addSuccess(Schema.Struct({ success: Schema.Boolean }));

const retrieveAccessToken = HttpApiEndpoint.get("retrieveAccessToken", "/token")
  .setUrlParams(Schema.Struct({ shop: ShopDomain }))
  .addSuccess(TokenRetrieveResponseSchema);

const deleteAccessToken = HttpApiEndpoint.post(
  "deleteAccessToken",
  "/token/delete"
)
  .setPayload(TokenDeleteRequestSchema)
  .addSuccess(TokenDeleteResponseSchema);

const exchangeCodeForToken = HttpApiEndpoint.post(
  "exchangeCodeForToken",
  "/token/exchange"
)
  .setPayload(TokenExchangeRequestSchema)
  .addSuccess(Schema.Unknown); // Shopify's response format varies

// Group endpoints
const shopifyOAuthGroup = HttpApiGroup.make("shopifyOAuth")
  .add(generateNonce)
  .add(storeNonce)
  .add(verifyNonce)
  .add(consumeNonce)
  .add(storeAccessToken)
  .add(retrieveAccessToken)
  .add(deleteAccessToken)
  .add(exchangeCodeForToken);

// Create API
const api = HttpApi.make("shopifyOAuthApi").add(shopifyOAuthGroup);

// Implement handlers
const shopifyOAuthGroupLive = HttpApiBuilder.group(
  api,
  "shopifyOAuth",
  (handlers) =>
    Effect.gen(function* () {
      const nonceManager = yield* NonceManager;
      const accessTokenService = yield* AccessTokenService;

      return handlers
        .handle("generateNonce", () =>
          Effect.gen(function* () {
            const nonce = yield* nonceManager.generate();
            return { nonce };
          })
        )
        .handle("storeNonce", ({ payload }) =>
          Effect.gen(function* () {
            yield* nonceManager.store(payload.nonce);
            return { success: true };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("verifyNonce", ({ payload }) =>
          Effect.gen(function* () {
            const valid = yield* nonceManager.verify(payload.nonce);
            return { valid };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("consumeNonce", ({ payload }) =>
          Effect.gen(function* () {
            yield* nonceManager.consume(payload.nonce);
            return { success: true };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("storeAccessToken", ({ payload }) =>
          Effect.gen(function* () {
            yield* accessTokenService.store(
              payload.shop,
              payload.accessToken,
              payload.scope
            );
            return { success: true };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("retrieveAccessToken", ({ urlParams }) =>
          Effect.gen(function* () {
            const accessToken = yield* accessTokenService.retrieve(
              urlParams.shop
            );
            return {
              accessToken,
              scope: accessToken ? "read_products,write_products" : undefined,
            };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("deleteAccessToken", ({ payload }) =>
          Effect.gen(function* () {
            const deleted = yield* accessTokenService.delete(payload.shop);
            return { success: true, deleted };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("exchangeCodeForToken", ({ payload }) =>
          Effect.gen(function* () {
            const response = yield* accessTokenService.exchangeCodeForToken(
              payload.shop,
              payload.code,
              payload.clientId,
              payload.clientSecret
            );
            return response;
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          )
        );
    })
);

export function getShopifyOAuthHandler(doState: DurableObjectState) {
  // Create layers
  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  const DrizzleLayer = Layer.provide(
    DrizzleShopifyOAuthClientLive,
    DORepoLayer
  );

  const NonceLayer = Layer.provide(NonceRepoLive, DrizzleLayer);
  const AccessTokenLayer = Layer.provide(AccessTokenRepoLive, DrizzleLayer);

  const ServiceLayers = Layer.mergeAll(NonceLayer, AccessTokenLayer);

  const finalLayer = Layer.provide(ServiceLayers, DORepoLayer);

  // Group layer with all dependencies
  const shopifyOAuthGroupLayerLive = Layer.provide(
    shopifyOAuthGroupLive,
    finalLayer
  );

  // API layer with Swagger
  const ShopifyOAuthApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(shopifyOAuthGroupLayerLive)
  );

  const SwaggerLayer = HttpApiSwagger.layer().pipe(
    Layer.provide(ShopifyOAuthApiLive)
  );

  // Final handler with all layers merged
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(ShopifyOAuthApiLive, SwaggerLayer, HttpServer.layerContext)
  );

  // Wrap handler with additional error logging
  const wrappedHandler = async (request: Request): Promise<Response> => {
    const response = await handler(request);
    return response;
  };

  return { dispose, handler: wrappedHandler };
}
