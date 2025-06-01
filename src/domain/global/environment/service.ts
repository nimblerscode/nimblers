import { Context } from "effect";
import type { OrganizationSlug } from "../organization/models";

// Environment types
export type Environment = "development" | "staging" | "production";

// Environment configuration interface
export abstract class EnvironmentConfigService extends Context.Tag(
  "@core/environment/ConfigService",
)<
  EnvironmentConfigService,
  {
    readonly getBaseUrl: () => string;
    readonly getShopifyOAuthCallbackUrl: () => string;
    readonly getShopifyWebhookUrl: (path: string) => string;
    readonly getInvitationUrl: (token: string) => string;
    readonly getVerificationUrl: (token: string) => string;
    readonly getOrganizationUrl: (slug: OrganizationSlug) => string;
    readonly getEnvironment: () => Environment;
  }
>() {}
