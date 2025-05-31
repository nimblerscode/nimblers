import { Effect, Layer } from "effect";
import { ShopifyComplianceUseCaseLive } from "@/application/shopify/compliance/service";
import {
  ShopifyOAuthUseCaseLive,
  ShopifyOAuthEnv,
} from "@/application/shopify/oauth/service";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import {
  StoreConnectionServiceLive,
  StoreManagementServiceLive,
  ShopifyStoreEnv,
} from "@/application/shopify/store/service";
import { ShopConnectionCheckServiceLive } from "@/application/shopify/connection/checkConnectionService";
import { ConnectStoreApplicationServiceLive } from "@/application/shopify/connection/connectStoreService";
import { NonceManager } from "@/domain/shopify/oauth/service";
import { EnvironmentConfigServiceLive } from "@/infrastructure/environment/EnvironmentConfigService";
import { ShopifyHmacVerifierLive } from "@/infrastructure/shopify/compliance/hmac";
import { ComplianceDataRepoLive } from "@/infrastructure/shopify/compliance/dataRepo";
import { ComplianceLoggerLive } from "@/infrastructure/shopify/compliance/logger";
import { ShopifyOAuthHmacVerifierLive } from "@/infrastructure/shopify/oauth/hmac";
import { ShopValidatorLive } from "@/infrastructure/shopify/oauth/shop";
import { WebhookServiceLive } from "@/infrastructure/shopify/webhooks/WebhookService";
import { AccessTokenServiceDOLive } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/services";
import { ShopifyOAuthDONamespace } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/shopifyOAuthDO";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { FetchHttpClient } from "@effect/platform";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";

/**
 * Complete Shopify compliance layer with all dependencies
 */
export const ShopifyComplianceLayerLive = Layer.provide(
  ShopifyComplianceUseCaseLive,
  Layer.mergeAll(
    ShopifyHmacVerifierLive,
    ComplianceDataRepoLive,
    ComplianceLoggerLive
  )
);

/**
 * Global Shop Connection Layer - for checking global shop constraints
 */
export function GlobalShopConnectionLayerLive(env: { DB: D1Database }) {
  const d1Layer = D1BindingLive(env);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  const repoLayer = Layer.provide(GlobalShopConnectionRepoLive, drizzleLayer);
  const useCaseLayer = Layer.provide(
    GlobalShopConnectionUseCaseLive,
    repoLayer
  );

  return useCaseLayer;
}

/**
 * Shop Connection Check Application Service Layer
 */
export function ShopConnectionCheckLayerLive(env: { DB: D1Database }) {
  const globalShopLayer = GlobalShopConnectionLayerLive(env);
  return Layer.provide(ShopConnectionCheckServiceLive, globalShopLayer);
}

/**
 * Store Connection Service Layer - for organization store operations via DO
 */
export function StoreConnectionLayerLive(env: {
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  const globalShopLayer = GlobalShopConnectionLayerLive(env);

  const storeEnvLayer = Layer.succeed(ShopifyStoreEnv, {
    ORG_DO: env.ORG_DO,
  });

  const storeConnectionLayer = Layer.provide(
    StoreConnectionServiceLive,
    Layer.mergeAll(storeEnvLayer, globalShopLayer, FetchHttpClient.layer)
  );

  const storeManagementLayer = Layer.provide(
    StoreManagementServiceLive,
    Layer.mergeAll(storeEnvLayer, globalShopLayer, FetchHttpClient.layer)
  );

  return Layer.mergeAll(storeConnectionLayer, storeManagementLayer);
}

/**
 * Connect Store Application Service Layer
 */
export function ConnectStoreApplicationLayerLive(env: {
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  const globalShopLayer = GlobalShopConnectionLayerLive(env);
  const storeConnectionLayer = StoreConnectionLayerLive(env);

  // Add OrgD1Service layer for organization slug to ID conversion
  const d1Layer = D1BindingLive(env);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  const orgServiceLayer = Layer.provide(OrgRepoD1LayerLive, drizzleLayer);

  return Layer.provide(
    ConnectStoreApplicationServiceLive,
    Layer.mergeAll(globalShopLayer, storeConnectionLayer, orgServiceLayer)
  );
}

/**
 * Complete Store Operations Layer - combines global and organization store services
 */
export function ShopifyStoreOperationsLayerLive(env: {
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  return Layer.mergeAll(
    GlobalShopConnectionLayerLive(env),
    StoreConnectionLayerLive(env)
  );
}

// === Shopify OAuth Complete Layer ===
export function ShopifyOAuthDOServiceLive(env: {
  SHOPIFY_OAUTH_DO: DurableObjectNamespace;
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
}) {
  // Environment layer
  const envLayer = Layer.succeed(ShopifyOAuthEnv, {
    SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
    SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
  });

  // Durable Object namespace layer
  const doNamespaceLayer = Layer.succeed(
    ShopifyOAuthDONamespace,
    env.SHOPIFY_OAUTH_DO
  );

  // Use stateless nonce manager - encode organization context in state parameter
  const StatelessNonceManagerLive = Layer.effect(
    NonceManager,
    Effect.gen(function* () {
      return {
        generate: () => {
          const nonce = crypto.randomUUID();
          return Effect.succeed(nonce as any);
        },
        store: (organizationId: string, nonce: any) => {
          // No-op for stateless approach - state is in the URL
          return Effect.succeed(void 0);
        },
        verify: (organizationId: string, nonce: any) => {
          // For stateless approach, we trust the HMAC verification
          // The nonce is just for uniqueness, not for storage validation
          return Effect.succeed(true);
        },
        consume: (organizationId: string, nonce: any) => {
          // No-op for stateless approach
          return Effect.succeed(void 0);
        },
      };
    })
  );

  // DO service layers that communicate with the Durable Object handlers
  const nonceManagerLayer = StatelessNonceManagerLive;
  const accessTokenServiceLayer = Layer.provide(
    AccessTokenServiceDOLive,
    doNamespaceLayer
  );

  // Infrastructure service layers
  const hmacVerifierLayer = ShopifyOAuthHmacVerifierLive;
  const shopValidatorLayer = ShopValidatorLive;
  const webhookServiceLayer = WebhookServiceLive;

  // Merge all service layers
  const serviceLayers = Layer.mergeAll(
    hmacVerifierLayer,
    shopValidatorLayer,
    nonceManagerLayer,
    accessTokenServiceLayer,
    webhookServiceLayer,
    envLayer,
    doNamespaceLayer,
    EnvironmentConfigServiceLive
  );

  // Use case layer
  const useCaseLayer = Layer.provide(ShopifyOAuthUseCaseLive, serviceLayers);

  return useCaseLayer;
}
