import { Layer } from "effect";
import {
  EnvironmentConfigService,
  type Environment,
} from "@/domain/global/environment/service";

// Type for Cloudflare Workers global environment
declare global {
  var ENVIRONMENT: string | undefined;
  var DEV_TUNNEL_URL: string | undefined;
}

// Environment configuration based on runtime environment
export const EnvironmentConfigServiceLive = Layer.succeed(
  EnvironmentConfigService,
  {
    getEnvironment: (): Environment => {
      // Determine environment from various sources
      if (typeof process !== "undefined" && process.env.NODE_ENV) {
        return process.env.NODE_ENV as Environment;
      }

      // Check for Cloudflare Workers environment
      if (typeof globalThis !== "undefined" && "caches" in globalThis) {
        // In Cloudflare Workers, check for environment indicators
        if (globalThis.ENVIRONMENT) {
          return globalThis.ENVIRONMENT as Environment;
        }
      }

      // Default to development
      return "development";
    },

    getBaseUrl: () => {
      const env = getEnvironment();
      switch (env) {
        case "production":
          return "https://nimblers.com";
        case "staging":
          return "https://staging.nimblers.com";
        default:
          // Check for dev tunnel URL or default to localhost
          if (typeof globalThis !== "undefined" && globalThis.DEV_TUNNEL_URL) {
            return globalThis.DEV_TUNNEL_URL;
          }
          return "http://localhost:5173";
      }
    },

    getShopifyOAuthCallbackUrl: () => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/shopify/oauth/callback`;
    },

    getShopifyWebhookUrl: (path: string) => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}${path}`;
    },

    getInvitationUrl: (token: string) => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/invite/${token}`;
    },

    getVerificationUrl: (token: string) => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/verify?token=${token}`;
    },

    getOrganizationUrl: (slug: string) => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/${slug}`;
    },
  }
);

// Helper function to get environment (duplicated for use in implementation)
function getEnvironment(): Environment {
  if (typeof process !== "undefined" && process.env.NODE_ENV) {
    return process.env.NODE_ENV as Environment;
  }

  if (typeof globalThis !== "undefined" && "caches" in globalThis) {
    if (globalThis.ENVIRONMENT) {
      return globalThis.ENVIRONMENT as Environment;
    }
  }

  return "development";
}

// Helper function to get base URL (duplicated for use in implementation)
function getBaseUrl(): string {
  const env = getEnvironment();
  switch (env) {
    case "production":
      return "https://nimblers.com";
    case "staging":
      return "https://staging.nimblers.com";
    default:
      if (typeof globalThis !== "undefined" && globalThis.DEV_TUNNEL_URL) {
        return globalThis.DEV_TUNNEL_URL;
      }
      return "http://localhost:5173";
  }
}
