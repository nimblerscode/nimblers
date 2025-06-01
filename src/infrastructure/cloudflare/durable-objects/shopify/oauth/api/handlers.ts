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
import { OrganizationSlug } from "@/domain/global/organization/models";
import { AccessToken, Scope, ShopDomain } from "@/domain/shopify/oauth/models";
import {
  AccessTokenService,
  NonceManager,
} from "@/domain/shopify/oauth/service";
import {
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { AccessTokenRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/AccessTokenRepoLive";
import { NonceRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/NonceRepoLive";
import { ShopifyOAuthApiSchemas } from "./schemas";

// Define endpoints using shared schemas
const generateNonce = HttpApiEndpoint.post(
  "generateNonce",
  "/nonce/generate"
).addSuccess(ShopifyOAuthApiSchemas.generateNonce.response);

const storeNonce = HttpApiEndpoint.post("storeNonce", "/nonce/store")
  .setPayload(ShopifyOAuthApiSchemas.storeNonce.request)
  .addSuccess(ShopifyOAuthApiSchemas.storeNonce.response);

const verifyNonce = HttpApiEndpoint.post("verifyNonce", "/nonce/verify")
  .setPayload(ShopifyOAuthApiSchemas.verifyNonce.request)
  .addSuccess(ShopifyOAuthApiSchemas.verifyNonce.response);

const consumeNonce = HttpApiEndpoint.post("consumeNonce", "/nonce/consume")
  .setPayload(ShopifyOAuthApiSchemas.consumeNonce.request)
  .addSuccess(ShopifyOAuthApiSchemas.consumeNonce.response);

const storeAccessToken = HttpApiEndpoint.post(
  "storeAccessToken",
  "/token/store"
)
  .setPayload(ShopifyOAuthApiSchemas.storeToken.request)
  .addSuccess(ShopifyOAuthApiSchemas.storeToken.response);

const retrieveAccessToken = HttpApiEndpoint.get("retrieveAccessToken", "/token")
  .setUrlParams(Schema.Struct({ shop: ShopDomain }))
  .addSuccess(ShopifyOAuthApiSchemas.retrieveToken.response);

const deleteAccessToken = HttpApiEndpoint.post(
  "deleteAccessToken",
  "/token/delete"
)
  .setPayload(ShopifyOAuthApiSchemas.deleteToken.request)
  .addSuccess(ShopifyOAuthApiSchemas.deleteToken.response);

const exchangeCodeForToken = HttpApiEndpoint.post(
  "exchangeCodeForToken",
  "/token/exchange"
)
  .setPayload(ShopifyOAuthApiSchemas.exchangeToken.request)
  .addSuccess(ShopifyOAuthApiSchemas.exchangeToken.response);

const retrieveAccessTokenWithOrganization = HttpApiEndpoint.get(
  "retrieveAccessTokenWithOrganization",
  "/token/with-organization"
)
  .setUrlParams(Schema.Struct({ shop: ShopDomain }))
  .addSuccess(
    Schema.Struct({
      accessToken: Schema.NullOr(AccessToken),
      scope: Schema.optional(Scope),
      organizationSlug: Schema.optional(OrganizationSlug),
    })
  );

// Group endpoints
const shopifyOAuthGroup = HttpApiGroup.make("shopifyOAuth")
  .add(generateNonce)
  .add(storeNonce)
  .add(verifyNonce)
  .add(consumeNonce)
  .add(storeAccessToken)
  .add(retrieveAccessToken)
  .add(deleteAccessToken)
  .add(exchangeCodeForToken)
  .add(retrieveAccessTokenWithOrganization);

// Create API
const api = HttpApi.make("shopifyOAuthApi").add(shopifyOAuthGroup);

// Export the API for use in client generation
export { api as shopifyOAuthApi };

// Implement handlers - no organization ID parameter needed since it comes from requests
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
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("verifyNonce", ({ payload }) =>
          Effect.gen(function* () {
            // Extract organizationId from payload
            const valid = yield* nonceManager.verify(payload.nonce);
            return { valid };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("consumeNonce", ({ payload }) =>
          Effect.gen(function* () {
            // Extract organizationId from payload
            yield* nonceManager.consume(payload.nonce);
            return { success: true };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("storeAccessToken", ({ payload }) =>
          Effect.gen(function* () {
            // DEBUG: Log incoming payload for debugging
            yield* Effect.logInfo("=== TOKEN STORE DEBUG ===");
            yield* Effect.logInfo("Received payload", { payload });
            yield* Effect.logInfo("Payload keys", {
              keys: Object.keys(payload),
            });

            // Store the access token with organization context
            yield* accessTokenService.store(
              payload.shop,
              payload.accessToken,
              payload.scope,
              payload.organizationSlug // Include organization context
            );
            return { success: true };
          }).pipe(
            Effect.mapError((error) => {
              Effect.logError("=== TOKEN STORE ERROR ===", { error }).pipe(
                Effect.ignore
              );
              Effect.logError("Error details", {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : "No stack",
              }).pipe(Effect.ignore);
              return new HttpApiError.HttpApiDecodeError({
                message: error instanceof Error ? error.message : String(error),
                issues: [],
              });
            })
          )
        )
        .handle("retrieveAccessToken", ({ urlParams }) =>
          Effect.gen(function* () {
            // Extract organizationId from URL params
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
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("deleteAccessToken", ({ payload }) =>
          Effect.gen(function* () {
            // Extract organizationId from payload
            yield* accessTokenService.delete(payload.shop);
            return { success: true, deleted: true };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message:
                    error instanceof Error ? error.message : String(error),
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
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        )
        .handle("retrieveAccessTokenWithOrganization", ({ urlParams }) =>
          Effect.gen(function* () {
            // Extract organizationId from URL params
            const accessToken = yield* accessTokenService.retrieve(
              urlParams.shop
            );
            return {
              accessToken,
              scope: accessToken
                ? ("read_products,write_products" as Scope)
                : undefined,
              organizationSlug: undefined,
            };
          }).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  issues: [],
                })
            )
          )
        );
    })
);

export function getShopifyOAuthHandler(doState: DurableObjectState) {
  // For shared Shopify OAuth DO, we don't extract organization ID from DO name
  // Organization context comes from individual requests

  // Create layers following the organization pattern
  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  // Provide DrizzleDOClientLive directly to repository layers
  const NonceLayer = Layer.provide(NonceRepoLive, DrizzleDOClientLive);
  const AccessTokenLayer = Layer.provide(
    AccessTokenRepoLive,
    DrizzleDOClientLive
  );

  const ServiceLayers = Layer.mergeAll(NonceLayer, AccessTokenLayer);

  const finalLayer = Layer.provide(ServiceLayers, DORepoLayer);

  // Group layer with all dependencies - no organization ID needed at this level
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
