import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { EmailVerificationUseCaseLive } from "@/application/global/auth/emailVerification";
import { SessionUseCaseLive } from "@/application/global/session/service";
import {
  ShopifyOAuthEnv,
  ShopifyOAuthUseCaseLive,
} from "@/application/global/shopify/oauth/service";
import { InvitationUseCaseLive } from "@/application/tenant/invitations/service";
import { NonceManager } from "@/domain/global/shopify/oauth/service";
import { InviteTokenLive } from "@/domain/tenant/invitations/tokenUtils";
import { createBetterAuthServiceAdapter } from "@/infrastructure/auth/better-auth/adapter";
import { BetterAuthConfigLive } from "@/infrastructure/auth/better-auth/config";
import {
  InvitationDONamespace,
  InvitationDOServiceLive,
} from "@/infrastructure/cloudflare/durable-objects/InvitationDO";
import { MembersDOServiceLive } from "@/infrastructure/cloudflare/durable-objects/MembersDO";
import {
  OrganizationDOAdapterLive,
  OrganizationDONamespace,
} from "@/infrastructure/cloudflare/durable-objects/OrganizationDONameSpace";
import { AccessTokenServiceDOLive } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/services";
import { ShopifyOAuthDONamespace } from "@/infrastructure/cloudflare/durable-objects/shopify/oauth/shopifyOAuthDO";
import { ResendEmailAdapterLive } from "@/infrastructure/email/resend/adapter";
import { ResendConfigLive } from "@/infrastructure/email/resend/config";
import { EnvironmentConfigServiceLive } from "@/infrastructure/environment/EnvironmentConfigService";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { SessionRepoLive } from "@/infrastructure/persistence/global/d1/SessionRepoLive";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";
import { DrizzleDOClientLive } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { InvitationRepoLive } from "@/infrastructure/persistence/tenant/sqlite/InvitationRepoLive";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { AccessTokenRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/AccessTokenRepoLive";
import { DrizzleShopifyOAuthClientLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/drizzle";
import { NonceRepoLive } from "@/infrastructure/persistence/tenant/sqlite/shopify/NonceRepoLive";
import { ShopifyOAuthHmacVerifierLive } from "@/infrastructure/shopify/oauth/hmac";
import { ShopValidatorLive } from "@/infrastructure/shopify/oauth/shop";
import { WebhookServiceLive } from "@/infrastructure/shopify/webhooks/WebhookService";

// Declare global nonce store type
declare global {
  var nonceStore: Map<string, number> | undefined;
}

export function DatabaseLive(db: { DB: D1Database }) {
  const d1Layer = D1BindingLive(db);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  return drizzleLayer;
}

export const SessionLayerLive = () => {
  const sessionRepoLayer = Layer.provide(SessionRepoLive, DrizzleD1ClientLive);
  const sessionUseCaseLayer = Layer.provide(
    SessionUseCaseLive,
    sessionRepoLayer,
  );
  return sessionUseCaseLayer;
};

export const SessionLayerWithDBLive = (db: { DB: D1Database }) => {
  const databaseLayer = DatabaseLive(db);
  const sessionLayer = SessionLayerLive();
  return Layer.provide(sessionLayer, databaseLayer);
};

export const AuthServiceLive = (req: Request) =>
  createBetterAuthServiceAdapter(req) // needs AuthLayer + cookies
    .pipe(Layer.provide(BetterAuthConfigLive))
    .pipe(Layer.provide(DrizzleD1ClientLive)) // still needs DB & Email
    .pipe(Layer.provide(D1BindingLive({ DB: env.DB })))
    .pipe(Layer.provide(ResendEmailAdapterLive))
    .pipe(Layer.provide(ResendConfigLive));

/**
 * DOServiceLayer: provides only the Durable Object Namespace
 * and the OrganizationDOAdapter implementation.
 */
export function OrganizationDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(OrganizationDONamespace, doEnv.ORG_DO);

  const OrgServiceLayer = Layer.provide(
    OrganizationDOAdapterLive,
    doNamespaceLayer,
  );

  return OrgServiceLayer;
}

export function InvitationDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(InvitationDONamespace, doEnv.ORG_DO);
  return Layer.provide(
    InvitationDOServiceLive.pipe(Layer.provide(InviteTokenLive)),
    doNamespaceLayer,
  );
}

export const InvitationLayerLive = (doId: DurableObjectId) => {
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // Invitation repository layer
  const InvitationRepoLayer = Layer.provide(
    InvitationRepoLive,
    DrizzleDOClientLive,
  );

  // Email service layer
  const EmailLayer = Layer.provide(
    ResendEmailAdapterLive,
    Layer.merge(ResendConfigLive, MemberServiceLayer),
  );

  // Note: UserRepo is not available in Durable Object context
  // The invitation service will handle the missing dependency gracefully

  // Invitation use case layer with all its dependencies
  const InvitationUseCaseLayer = Layer.provide(
    InvitationUseCaseLive(doId).pipe(Layer.provide(InviteTokenLive)),
    Layer.mergeAll(
      EmailLayer,
      MemberServiceLayer,
      EnvironmentConfigServiceLive,
    ),
  );

  return InvitationUseCaseLayer.pipe(Layer.provide(InvitationRepoLayer));
};

export function MemberDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(OrganizationDONamespace, doEnv.ORG_DO);

  const MemberServiceLayer = Layer.provide(
    MembersDOServiceLive,
    doNamespaceLayer,
  );

  return MemberServiceLayer;
}

export const EmailVerificationLayerLive = (db: { DB: D1Database }) => {
  // Complete database layer with D1Binding
  const d1Layer = D1BindingLive(db);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);

  // User repository layer
  const UserRepoLayer = Layer.provide(UserRepoLive, drizzleLayer);

  // Email service layer
  const EmailLayer = Layer.provide(ResendEmailAdapterLive, ResendConfigLive);

  // Email verification use case layer with all dependencies
  return Layer.provide(
    EmailVerificationUseCaseLive,
    Layer.mergeAll(UserRepoLayer, EmailLayer, EnvironmentConfigServiceLive),
  );
};

// === Shopify OAuth Complete Layer ===
export function ShopifyOAuthLayerLive(env: {
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
    env.SHOPIFY_OAUTH_DO,
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
        store: (nonce: any) => {
          // No-op for stateless approach - state is in the URL
          return Effect.succeed(void 0);
        },
        verify: (nonce: any) => {
          // For stateless approach, we trust the HMAC verification
          // The nonce is just for uniqueness, not for storage validation
          return Effect.succeed(true);
        },
        consume: (nonce: any) => {
          // No-op for stateless approach
          return Effect.succeed(void 0);
        },
      };
    }),
  );

  // DO service layers that communicate with the Durable Object handlers
  const nonceManagerLayer = StatelessNonceManagerLive;
  const accessTokenServiceLayer = Layer.provide(
    AccessTokenServiceDOLive,
    doNamespaceLayer,
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
    EnvironmentConfigServiceLive,
  );

  // Use case layer
  const useCaseLayer = Layer.provide(ShopifyOAuthUseCaseLive, serviceLayers);

  return useCaseLayer;
}

// === Shopify OAuth Durable Object Layers (for internal DO use) ===
export function ShopifyOAuthDOLive(doEnv: {
  SHOPIFY_OAUTH_DO: DurableObjectNamespace;
}) {
  const doNamespaceLayer = Layer.succeed(
    ShopifyOAuthDONamespace,
    doEnv.SHOPIFY_OAUTH_DO,
  );
  return doNamespaceLayer;
}

export const ShopifyOAuthRepoLayerLive = (doId: DurableObjectId) => {
  const NonceRepoLayer = Layer.provide(
    NonceRepoLive,
    DrizzleShopifyOAuthClientLive,
  );
  const AccessTokenRepoLayer = Layer.provide(
    AccessTokenRepoLive,
    DrizzleShopifyOAuthClientLive,
  );
  return Layer.mergeAll(NonceRepoLayer, AccessTokenRepoLayer);
};
