import { Layer } from "effect";
import { env } from "cloudflare:workers";
import {
  type Environment,
  EnvironmentConfigService,
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
      // Check Cloudflare Workers environment first
      if (env.ENVIRONMENT) {
        return env.ENVIRONMENT as Environment;
      }

      // Fallback to Node.js process env for local development
      if (typeof process !== "undefined" && process.env.NODE_ENV) {
        return process.env.NODE_ENV as Environment;
      }

      // Default to development
      return "development";
    },

    getBaseUrl: () => {
      const environment = getEnvironment();
      switch (environment) {
        case "production":
          return "https://nimblers.com";
        case "staging":
          return "https://staging.nimblers.com";
        default:
          // Check for dev tunnel URL from Cloudflare Workers env
          if (env.DEV_TUNNEL_URL && !env.DEV_TUNNEL_URL.includes("localhost")) {
            return env.DEV_TUNNEL_URL;
          }

          // Fallback to process.env for local development
          if (
            typeof process !== "undefined" &&
            process.env.DEV_TUNNEL_URL &&
            process.env.DEV_TUNNEL_URL !== "REPLACE_WITH_YOUR_TUNNEL_URL"
          ) {
            return process.env.DEV_TUNNEL_URL;
          }

          return "http://localhost:5173";
      }
    },

    getShopifyOAuthCallbackUrl: () => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/shopify/oauth/callback`;
    },

    getShopifyWebhookUrl: (path: string) => {
      const environment = getEnvironment();
      const baseUrl = getBaseUrl();

      // In development, only skip webhook registration if we don't have a tunnel URL
      if (
        environment === "development" &&
        baseUrl.startsWith("http://localhost")
      ) {
        return "SKIP_WEBHOOK_REGISTRATION";
      }

      // If we have a tunnel URL or are in staging/production, register webhooks
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

// Helper function to get environment
function getEnvironment(): Environment {
  // Check Cloudflare Workers environment first
  if (env.ENVIRONMENT) {
    return env.ENVIRONMENT as Environment;
  }

  // Fallback to Node.js process env
  if (typeof process !== "undefined" && process.env.NODE_ENV) {
    return process.env.NODE_ENV as Environment;
  }

  return "development";
}

// Helper function to get base URL
function getBaseUrl(): string {
  const environment = getEnvironment();
  switch (environment) {
    case "production":
      return "https://nimblers.com";
    case "staging":
      return "https://staging.nimblers.com";
    default:
      // Check for dev tunnel URL from Cloudflare Workers env
      if (env.DEV_TUNNEL_URL && !env.DEV_TUNNEL_URL.includes("localhost")) {
        return env.DEV_TUNNEL_URL;
      }

      // Fallback to process.env for local development
      if (
        typeof process !== "undefined" &&
        process.env.DEV_TUNNEL_URL &&
        process.env.DEV_TUNNEL_URL !== "REPLACE_WITH_YOUR_TUNNEL_URL"
      ) {
        return process.env.DEV_TUNNEL_URL;
      }

      return "http://localhost:5173";
  }
}
