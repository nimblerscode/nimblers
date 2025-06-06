import { env } from "cloudflare:workers";
import { Layer } from "effect";
import { EmailVerificationUseCaseLive } from "@/application/global/auth/emailVerification";
import { SessionUseCaseLive } from "@/application/global/session/service";
import { InvitationUseCaseLive } from "@/application/tenant/invitations/service";
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

// Messaging layers
import { SMSServiceLive } from "@/application/global/messaging/sms/service";
import { WhatsAppServiceLive } from "@/application/global/messaging/whatsapp/service";
import {
  TwilioConfig,
  TwilioApiClientLive,
  TwilioMessageProviderLive,
} from "@/infrastructure/messaging/twilio";
import type { PhoneNumber } from "@/domain/global/messaging/models";

// Conversation DO layers
import {
  ConversationDONamespace,
  ConversationDOAdapterLive,
} from "@/infrastructure/cloudflare/durable-objects/conversation/service";
import { ConversationRepoLive } from "@/infrastructure/persistence/conversation/sqlite/ConversationRepoLive";
import { MessageRepoLive } from "@/infrastructure/persistence/conversation/sqlite/MessageRepoLive";
import { ConversationUseCaseLive } from "@/application/tenant/conversations/service";

// Campaign and Segment layers
import { CampaignRepoLive } from "@/infrastructure/persistence/tenant/sqlite/CampaignRepoLive";
import { SegmentRepoLive } from "@/infrastructure/persistence/tenant/sqlite/SegmentRepoLive";
import { CampaignUseCaseLive } from "@/application/tenant/campaigns/service";
import { SegmentUseCaseLive } from "@/application/tenant/segments/service";
import { CampaignConversationRepoLive } from "@/infrastructure/persistence/tenant/sqlite/CampaignConversationRepoLive";
import { CampaignConversationUseCaseLive } from "@/application/tenant/campaigns/conversation-service";
import { CampaignSegmentRepoLive } from "@/infrastructure/persistence/tenant/sqlite/CampaignSegmentRepoLive";
import { CampaignSegmentUseCaseLive } from "@/application/tenant/campaigns/segment-service";

// Customer and Segment-Customer layers
import { CustomerRepoLive } from "@/infrastructure/persistence/tenant/sqlite/CustomerRepoLive";
import { SegmentCustomerRepoLive } from "@/infrastructure/persistence/tenant/sqlite/SegmentCustomerRepoLive";
import { CustomerUseCaseLive } from "@/application/tenant/customers/service";
import { SegmentCustomerUseCaseLive } from "@/application/tenant/segment-customers/service";
import {
  CustomerDONamespace,
  CustomerDOServiceLive,
} from "@/infrastructure/cloudflare/durable-objects/CustomerDO";

export function DatabaseLive(db: { DB: D1Database }) {
  const d1Layer = D1BindingLive(db);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  return drizzleLayer;
}

export const SessionLayerLive = () => {
  const sessionRepoLayer = Layer.provide(SessionRepoLive, DrizzleD1ClientLive);
  const sessionUseCaseLayer = Layer.provide(
    SessionUseCaseLive,
    sessionRepoLayer
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

  // Note: UserRepo is not available in Durable Object context
  // The invitation service will handle the missing dependency gracefully

  // Invitation use case layer with all its dependencies
  const InvitationUseCaseLayer = Layer.provide(
    InvitationUseCaseLive(doId).pipe(Layer.provide(InviteTokenLive)),
    Layer.mergeAll(EmailLayer, MemberServiceLayer, EnvironmentConfigServiceLive)
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
    Layer.mergeAll(UserRepoLayer, EmailLayer, EnvironmentConfigServiceLive)
  );
};

// Messaging configuration layer
export function MessagingLayerLive(config: {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: PhoneNumber;
  twilioWebhookUrl?: string;
}) {
  const TwilioConfigLayer = Layer.succeed(TwilioConfig, {
    accountSid: config.twilioAccountSid,
    authToken: config.twilioAuthToken,
    fromNumber: config.twilioFromNumber,
    webhookUrl: config.twilioWebhookUrl,
  });

  // Fetch-based Twilio client layer
  const TwilioClientLayer = Layer.provide(
    TwilioApiClientLive,
    TwilioConfigLayer
  );
  const MessageProviderLayer = Layer.provide(
    TwilioMessageProviderLive,
    TwilioClientLayer
  );

  const SMSLayer = Layer.provide(SMSServiceLive, MessageProviderLayer);
  const WhatsAppLayer = Layer.provide(
    WhatsAppServiceLive,
    MessageProviderLayer
  );

  return Layer.merge(SMSLayer, WhatsAppLayer);
}

// Conversation DO configuration layer
export function ConversationDOLive(doEnv: {
  CONVERSATION_DO: typeof env.CONVERSATION_DO;
}) {
  const doNamespaceLayer = Layer.succeed(
    ConversationDONamespace,
    doEnv.CONVERSATION_DO
  );
  return Layer.provide(ConversationDOAdapterLive, doNamespaceLayer);
}

export const ConversationLayerLive = () => {
  const ConversationRepoLayer = Layer.provide(
    ConversationRepoLive,
    DrizzleDOClientLive
  );

  // Import and provide MessageRepoLive
  const MessageRepoLayer = Layer.provide(MessageRepoLive, DrizzleDOClientLive);

  const ConversationUseCaseLayer = Layer.provide(
    ConversationUseCaseLive(),
    Layer.merge(ConversationRepoLayer, MessageRepoLayer)
  );
  return ConversationUseCaseLayer;
};

export const CampaignLayerLive = () => {
  const CampaignRepoLayer = Layer.provide(
    CampaignRepoLive,
    DrizzleDOClientLive
  );

  const CampaignConversationRepoLayer = Layer.provide(
    CampaignConversationRepoLive,
    DrizzleDOClientLive
  );

  const CampaignConversationUseCaseLayer = Layer.provide(
    CampaignConversationUseCaseLive,
    CampaignConversationRepoLayer
  );

  const CampaignSegmentRepoLayer = Layer.provide(
    CampaignSegmentRepoLive,
    DrizzleDOClientLive
  );

  const CampaignSegmentUseCaseLayer = Layer.provide(
    CampaignSegmentUseCaseLive(),
    CampaignSegmentRepoLayer
  );

  // Campaign use case layer needs all the required dependencies
  const CustomerLayer = CustomerLayerLive();
  const SegmentCustomerRepoLayer = Layer.provide(
    SegmentCustomerRepoLive,
    DrizzleDOClientLive
  );
  const SegmentCustomerLayer = Layer.provide(
    SegmentCustomerUseCaseLive,
    SegmentCustomerRepoLayer
  );

  const CampaignUseCaseLayer = Layer.provide(
    CampaignUseCaseLive(),
    Layer.mergeAll(
      CampaignRepoLayer,
      CampaignConversationUseCaseLayer,
      CampaignSegmentUseCaseLayer,
      CustomerLayer,
      SegmentCustomerLayer
    )
  );

  return CampaignUseCaseLayer;
};

export const SegmentLayerLive = (doId: DurableObjectId) => {
  const SegmentRepoLayer = Layer.provide(SegmentRepoLive, DrizzleDOClientLive);

  const SegmentUseCaseLayer = Layer.provide(
    SegmentUseCaseLive(doId),
    SegmentRepoLayer
  );

  return SegmentUseCaseLayer;
};

export const CampaignAndSegmentLayerLive = (doId: DurableObjectId) => {
  const campaignLayer = CampaignLayerLive();
  const segmentLayer = SegmentLayerLive(doId);

  return Layer.merge(campaignLayer, segmentLayer);
};

export const CustomerLayerLive = () => {
  const CustomerRepoLayer = Layer.provide(
    CustomerRepoLive,
    DrizzleDOClientLive
  );

  const CustomerUseCaseLayer = Layer.provide(
    CustomerUseCaseLive,
    CustomerRepoLayer
  );

  return CustomerUseCaseLayer;
};

export const SegmentCustomerLayerLive = (doId: DurableObjectId) => {
  const SegmentCustomerRepoLayer = Layer.provide(
    SegmentCustomerRepoLive,
    DrizzleDOClientLive
  );

  const SegmentCustomerUseCaseLayer = Layer.provide(
    SegmentCustomerUseCaseLive,
    SegmentCustomerRepoLayer
  );

  return SegmentCustomerUseCaseLayer;
};

export const CustomerAndSegmentCustomerLayerLive = (doId: DurableObjectId) => {
  const customerLayer = CustomerLayerLive();
  const segmentCustomerLayer = SegmentCustomerLayerLive(doId);

  return Layer.merge(customerLayer, segmentCustomerLayer);
};

export function CustomerDOLive(doEnv: { ORG_DO: typeof env.ORG_DO }) {
  const doNamespaceLayer = Layer.succeed(CustomerDONamespace, doEnv.ORG_DO);
  return Layer.provide(CustomerDOServiceLive, doNamespaceLayer);
}
