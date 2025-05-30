# Environment Configuration System

This document explains the environment-aware URL configuration system that replaces hardcoded URLs throughout the Nimblers application.

## Overview

The environment configuration system provides a centralized way to manage URLs and environment-specific settings across different deployment environments (development, staging, production).

## Problem Solved

**Before Implementation:**

- Hardcoded URLs scattered throughout the codebase (`nimblers.co`, `localhost:5173`, etc.)
- Manual URL changes required for different environments
- Inconsistent URL handling across services
- CloudFlare tunnel URLs hardcoded in development

**After Implementation:**

- Centralized environment configuration service
- Automatic URL resolution based on environment
- Consistent URL handling across all services
- Support for development tunnels and environment variables

## Architecture

### Domain Layer

- `EnvironmentConfigService`: Abstract service interface defining URL generation methods
- Environment type definitions and contracts

### Infrastructure Layer

- `EnvironmentConfigServiceLive`: Concrete implementation with environment detection
- Support for CloudFlare Workers global variables
- Automatic environment detection from multiple sources

## Implementation

### 1. Domain Service Interface

```typescript
// src/domain/global/environment/service.ts
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
```

### 2. Infrastructure Implementation

```typescript
// src/infrastructure/environment/EnvironmentConfigService.ts
export const EnvironmentConfigServiceLive = Layer.succeed(
  EnvironmentConfigService,
  {
    getEnvironment: (): Environment => {
      // Environment detection logic
    },

    getBaseUrl: () => {
      const env = getEnvironment();
      switch (env) {
        case "production":
          return "https://nimblers.co";
        case "staging":
          return "https://staging.nimblers.co";
        default:
          // Development with tunnel support
          if (globalThis.DEV_TUNNEL_URL) {
            return globalThis.DEV_TUNNEL_URL;
          }
          return "http://localhost:5173";
      }
    },

    // Other URL generation methods...
  }
);
```

## Environment Detection

The system detects the current environment from multiple sources:

1. **Node.js Environment**: `process.env.NODE_ENV`
2. **CloudFlare Workers**: `globalThis.ENVIRONMENT`
3. **Default**: Falls back to `"development"`

## URL Generation

### Base URLs by Environment

| Environment | Base URL                                               |
| ----------- | ------------------------------------------------------ |
| Production  | `https://nimblers.co`                                  |
| Staging     | `https://staging.nimblers.co`                          |
| Development | `http://localhost:5173` or `globalThis.DEV_TUNNEL_URL` |

### Generated URLs

- **OAuth Callback**: `{baseUrl}/shopify/oauth/callback`
- **Webhooks**: `{baseUrl}{path}` (e.g., `/shopify/webhooks/app/uninstalled`)
- **Invitations**: `{baseUrl}/invite/{token}`
- **Email Verification**: `{baseUrl}/verify?token={token}`
- **Organization**: `{baseUrl}/{slug}`

## Integration

### Service Dependencies

All services that need environment-aware URLs now depend on `EnvironmentConfigService`:

```typescript
// Layer configuration
export const ShopifyOAuthUseCaseLive: Layer.Layer<
  ShopifyOAuthUseCase,
  never,
  | ShopifyOAuthHmacVerifier
  | NonceManager
  | AccessTokenService
  | ShopValidator
  | ShopifyOAuthEnv
  | WebhookService
  | EnvironmentConfigService // Added dependency
> = Layer.effect(/* ... */);
```

### Usage in Services

```typescript
// In service implementation
const envConfig = yield * EnvironmentConfigService;
const webhookUrl = envConfig.getShopifyWebhookUrl(
  "/shopify/webhooks/app/uninstalled"
);
const invitationLink = envConfig.getInvitationUrl(token);
```

## Updated Services

### 1. Shopify OAuth Service

- **Before**: Hardcoded `"https://nimblers.co/shopify/oauth/callback"`
- **After**: `envConfig.getShopifyOAuthCallbackUrl()`

### 2. Webhook Registration

- **Before**: Hardcoded CloudFlare tunnel URL
- **After**: `envConfig.getShopifyWebhookUrl("/shopify/webhooks/app/uninstalled")`

### 3. Invitation Service

- **Before**: Hardcoded `"http://localhost:5173/invite/${token}"`
- **After**: `envConfig.getInvitationUrl(token)`

### 4. Email Verification

- **Before**: `process.env.APP_URL || "http://localhost:5173"`
- **After**: `envConfig.getBaseUrl()`

### 5. CORS Configuration

- **Before**: Hardcoded allowed origins array
- **After**: Environment-aware origin detection

## Development Support

### CloudFlare Tunnel Integration

For development with CloudFlare tunnels:

```typescript
// Set global variable for tunnel URL
declare global {
  var DEV_TUNNEL_URL: string | undefined;
}

// The service automatically uses tunnel URL when available
globalThis.DEV_TUNNEL_URL = "https://your-tunnel.trycloudflare.com";
```

### Environment Variables

The system supports standard environment variables:

- `NODE_ENV`: Node.js environment detection
- `ENVIRONMENT`: CloudFlare Workers environment
- `DEV_TUNNEL_URL`: Development tunnel URL

## Testing

### Test Configuration

All tests include mock environment configuration:

```typescript
const MockEnvironmentConfigService = Layer.succeed(EnvironmentConfigService, {
  getEnvironment: () => "development" as const,
  getBaseUrl: () => "http://localhost:5173",
  getShopifyOAuthCallbackUrl: () =>
    "http://localhost:5173/shopify/oauth/callback",
  getShopifyWebhookUrl: (path: string) => `http://localhost:5173${path}`,
  getInvitationUrl: (token: string) => `http://localhost:5173/invite/${token}`,
  getVerificationUrl: (token: string) =>
    `http://localhost:5173/verify?token=${token}`,
  getOrganizationUrl: (slug: string) => `http://localhost:5173/${slug}`,
});
```

### Test Results

- **OAuth Tests**: 162/162 passing ✅
- **Webhook Tests**: 6/6 passing ✅
- **Integration Tests**: All passing ✅

## Benefits

1. **Environment Consistency**: Automatic URL resolution for all environments
2. **Development Flexibility**: Support for tunnels and local development
3. **Maintainability**: Centralized URL management
4. **Type Safety**: Full TypeScript support with Effect-TS
5. **Testing**: Comprehensive test coverage with mocked services

## Migration Guide

### For New Services

1. Add `EnvironmentConfigService` to service dependencies
2. Use `envConfig.getXxxUrl()` methods instead of hardcoded URLs
3. Include `EnvironmentConfigServiceLive` in layer configuration

### For Existing Services

1. Replace hardcoded URLs with environment service calls
2. Update layer dependencies to include `EnvironmentConfigService`
3. Update tests to include mock environment service

## Future Enhancements

1. **Configuration Files**: Support for environment-specific config files
2. **Runtime Updates**: Dynamic URL updates without redeployment
3. **Validation**: URL format validation and health checks
4. **Monitoring**: URL resolution logging and metrics

## Related Documentation

- [Shopify OAuth Implementation](./shopify-oauth-implementation-guide.md)
- [Shopify App Uninstall Webhooks](./shopify-app-uninstall-webhooks.md)
- [Effect-TS Architecture Patterns](../README.md)
