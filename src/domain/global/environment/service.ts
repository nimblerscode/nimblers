import { Context } from "effect";

// Environment types
export type Environment = "development" | "staging" | "production";

// Environment configuration interface
export abstract class EnvironmentConfigService extends Context.Tag(
  "@core/environment/ConfigService"
)<
  EnvironmentConfigService,
  {
    readonly getBaseUrl: () => string;
    readonly getShopifyOAuthCallbackUrl: () => string;
    readonly getShopifyWebhookUrl: (path: string) => string;
    readonly getInvitationUrl: (token: string) => string;
    readonly getVerificationUrl: (token: string) => string;
    readonly getOrganizationUrl: (slug: string) => string;
    readonly getEnvironment: () => Environment;
  }
>() {}
