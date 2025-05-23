import { env } from "cloudflare:workers";
import { Layer } from "effect";
import { InvitationUseCaseLive } from "@/application/tenant/invitations/service";
import { InviteTokenLive } from "@/domain/tenant/invitations/tokenUtils";
import { createBetterAuthServiceAdapter } from "@/infrastructure/auth/better-auth/adapter";
import { BetterAuthConfigLive } from "@/infrastructure/auth/better-auth/config";
import {
  InvitationDONamespace,
  InvitationDOServiceLive,
} from "@/infrastructure/cloudflare/durable-objects/InvitationDO";
import {
  OrganizationDOAdapterLive,
  OrganizationDONamespace,
} from "@/infrastructure/cloudflare/durable-objects/OrganizationDONameSpace";
import { ResendEmailAdapterLive } from "@/infrastructure/email/resend/adapter";
import { ResendConfigLive } from "@/infrastructure/email/resend/config";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { DrizzleDOClientLive } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { InvitationRepoLive } from "@/infrastructure/persistence/tenant/sqlite/InvitationRepoLive";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { MembersDOServiceLive } from "@/infrastructure/cloudflare/durable-objects/MembersDO";

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
 * and the OrganizationDOAdapter implementation.
 */
export function OrganizationDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(OrganizationDONamespace, doEnv.ORG_DO);

  const OrgServiceLayer = Layer.provide(
    OrganizationDOAdapterLive,
    doNamespaceLayer
  );

  return OrgServiceLayer;
}

export function InvitationDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(InvitationDONamespace, doEnv.ORG_DO);
  return Layer.provide(
    InvitationDOServiceLive.pipe(Layer.provide(InviteTokenLive)),
    doNamespaceLayer
  );
}

export const InvitationLayerLive = (doId: DurableObjectId) => {
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // Invitation repository layer
  const InvitationRepoLayer = Layer.provide(
    InvitationRepoLive,
    DrizzleDOClientLive
  );

  // Email service layer
  const EmailLayer = Layer.provide(
    ResendEmailAdapterLive,
    Layer.merge(ResendConfigLive, MemberServiceLayer)
  );

  // User repository layer

  // Invitation use case layer with all its dependencies
  const InvitationUseCaseLayer = Layer.provide(
    InvitationUseCaseLive(doId).pipe(Layer.provide(InviteTokenLive)),
    Layer.mergeAll(EmailLayer, MemberServiceLayer)
  );

  return InvitationUseCaseLayer.pipe(Layer.provide(InvitationRepoLayer));
};

export function MemberDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(OrganizationDONamespace, doEnv.ORG_DO);

  const MemberServiceLayer = Layer.provide(
    MembersDOServiceLive,
    doNamespaceLayer
  );

  return MemberServiceLayer;
}
