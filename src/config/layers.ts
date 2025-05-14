import { env } from "cloudflare:workers";
import { createBetterAuthServiceAdapter } from "@/infrastructure/auth/better-auth/adapter";
import { BetterAuthConfigLive } from "@/infrastructure/auth/better-auth/config";
import {
  OrganizationDONamespace,
  OrganizationProvisionServiceLive,
} from "@/infrastructure/cloudflare/durable-objects/OrganizationDONameSpace";
import { ResendEmailAdapterLive } from "@/infrastructure/email/resend/adapter";
import { ResendConfigLive } from "@/infrastructure/email/resend/config";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { Layer } from "effect";

export function DatabaseLive(db: { DB: D1Database }) {
  const d1Layer = D1BindingLive(db);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  return drizzleLayer;
}

export const AuthServiceLive = (req: Request) =>
  createBetterAuthServiceAdapter(req) // needs AuthLayer + cookies
    .pipe(Layer.provide(BetterAuthConfigLive))
    .pipe(Layer.provide(DrizzleD1ClientLive)) // still needs DB & Email
    .pipe(Layer.provide(D1BindingLive({ DB: env.DB })))
    .pipe(Layer.provide(ResendEmailAdapterLive))
    .pipe(Layer.provide(ResendConfigLive));

/**
 * DOServiceLayer: provides only the Durable Object Namespace
 * and the OrganizationProvisionServiceLive (DO stub).
 */
export function OrganizationDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(OrganizationDONamespace, doEnv.ORG_DO);
  return Layer.provide(OrganizationProvisionServiceLive, doNamespaceLayer);
}
