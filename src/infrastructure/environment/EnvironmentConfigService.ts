import { Layer } from "effect";
import {
  type Environment,
  EnvironmentConfigService,
} from "@/domain/global/environment/service";

// Simplified environment configuration for Cloudflare Workers
export const EnvironmentConfigServiceLive = Layer.succeed(
  EnvironmentConfigService,
  {
    getEnvironment: (): Environment => {
      return "production";
    },

    getBaseUrl: () => {
      return "https://nimblers.co";
    },

    getShopifyOAuthCallbackUrl: () => {
      return "https://nimblers.co/shopify/oauth/callback";
    },

    getShopifyWebhookUrl: (path: string) => {
      return `https://nimblers.co${path}`;
    },

    getInvitationUrl: (token: string) => {
      return `https://nimblers.co/invite/${token}`;
    },

    getVerificationUrl: (token: string) => {
      return `https://nimblers.co/verify?token=${token}`;
    },

    getOrganizationUrl: (slug: string) => {
      return `https://nimblers.co/organization/${slug}`;
    },
  },
);
