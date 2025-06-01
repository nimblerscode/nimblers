import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import { ShopifyComplianceUseCaseLive } from "@/application/shopify/compliance/service";
import { ComplianceWebhookServiceLive } from "@/application/shopify/compliance/webhookService";
import { ShopifyConfigServiceLive } from "@/application/shopify/config/configService";
import { ShopConnectionCheckServiceLive } from "@/application/shopify/connection/checkConnectionService";
import {
  ConnectStoreApplicationServiceLive,
  ConnectStoreEnv,
} from "@/application/shopify/connection/connectStoreService";
import {
  ShopifyOAuthEnv,
  ShopifyOAuthUseCaseLive,
} from "@/application/shopify/oauth/service";
import { ShopifyOAuthApplicationServiceLive } from "@/application/shopify/routes/oauthApplicationService";
import { ShopifyStoreApplicationServiceLive } from "@/application/shopify/routes/storeApplicationService";
import {
  ShopifyStoreEnv,
  ShopifyStoreServiceLive,
} from "@/application/shopify/store/service";
import { NonceManager } from "@/domain/shopify/oauth/service";
import { AccessTokenServiceDOLive } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/services";
import { ShopifyOAuthDONamespace } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/shopifyOAuthDO";
import { EnvironmentConfigServiceLive } from "@/infrastructure/environment/EnvironmentConfigService";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";
import { ComplianceDataRepoLive } from "@/infrastructure/shopify/compliance/dataRepo";
import { ShopifyHmacVerifierLive } from "@/infrastructure/shopify/compliance/hmac";
import { ComplianceLoggerLive } from "@/infrastructure/shopify/compliance/logger";
import { ShopifyOAuthHmacVerifierLive } from "@/infrastructure/shopify/oauth/hmac";
import { ShopValidatorLive } from "@/infrastructure/shopify/oauth/shop";
import { ShopifyValidationServiceLive } from "@/infrastructure/shopify/validation/service";
import { WebhookServiceLive } from "@/infrastructure/shopify/webhooks/WebhookService";
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
 * Compliance Webhook Application Service Layer
 */
export const ComplianceWebhookLayerLive = Layer.provide(
  ComplianceWebhookServiceLive,
  ShopifyComplianceLayerLive
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
    Layer.mergeAll(repoLayer)
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
 * Unified Store Service Layer - for all store operations
 */
export function StoreConnectionLayerLive(env: {
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  const globalShopLayer = GlobalShopConnectionLayerLive(env);

  const storeEnvLayer = Layer.succeed(ShopifyStoreEnv, {
    ORG_DO: env.ORG_DO,
  });

  const storeServiceLayer = Layer.provide(
    ShopifyStoreServiceLive,
    Layer.mergeAll(storeEnvLayer, globalShopLayer, FetchHttpClient.layer)
  );

  return storeServiceLayer;
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

  // Add ConnectStoreEnv layer for OrganizationDO access
  const connectStoreEnvLayer = Layer.succeed(ConnectStoreEnv, {
    ORG_DO: env.ORG_DO,
  });

  return Layer.provide(
    ConnectStoreApplicationServiceLive,
    Layer.mergeAll(
      globalShopLayer,
      storeConnectionLayer,
      orgServiceLayer,
      connectStoreEnvLayer
    )
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
          const nonce = nanoid();
          return Effect.succeed(nonce as any);
        },
        store: (_nonce: any) => {
          // No-op for stateless approach - state is in the URL
          return Effect.succeed(void 0);
        },
        verify: (_nonce: any) => {
          // For stateless approach, we trust the HMAC verification
          // The nonce is just for uniqueness, not for storage validation
          return Effect.succeed(true);
        },
        consume: (_nonce: any) => {
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

// Add these new layer exports
export const ShopifyValidationLayerLive = ShopifyValidationServiceLive;
export const ShopifyConfigLayerLive = ShopifyConfigServiceLive;

export function ShopifyOAuthApplicationLayerLive(env: {
  SHOPIFY_OAUTH_DO: DurableObjectNamespace;
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  const baseLayer = Layer.merge(
    ShopifyOAuthDOServiceLive(env),
    ConnectStoreApplicationLayerLive(env)
  );
  return Layer.provide(ShopifyOAuthApplicationServiceLive, baseLayer);
}

export function ShopifyStoreApplicationLayerLive(env: {
  ORG_DO: DurableObjectNamespace<any>;
  DB: D1Database;
}) {
  const baseLayer = ConnectStoreApplicationLayerLive(env);
  return Layer.provide(ShopifyStoreApplicationServiceLive, baseLayer);
}

/**
 * Generates Shopify OAuth authorization URL with proper state management
 *
 * @param organizationSlug - Used for namespacing the Durable Object
 * @param shop - The Shopify store domain
 * @param clientId - Shopify app client ID
 * @param scope - Required OAuth scopes
 * @param redirectUri - OAuth callback URL
 * @returns Complete authorization URL with encoded state
 */
export const generateShopifyOAuthUrl = (
  organizationSlug: string,
  shop: string,
  clientId: string,
  scope: string,
  redirectUri: string
): string => {
  // Generate organization-scoped state parameter
  // Format: {organizationSlug}_org_{nonce}
  const nonce = nanoid();
  const state = `${organizationSlug}_org_${nonce}`;

  // Build authorization URL
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return authUrl.toString();
};
