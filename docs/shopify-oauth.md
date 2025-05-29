# Shopify OAuth Implementation

This document describes the complete Shopify OAuth authorization code grant flow implementation for the Nimblers application.

## Overview

The implementation follows Shopify's OAuth authorization code grant flow and includes:

- **Domain Layer**: Models, schemas, and service interfaces
- **Infrastructure Layer**: HMAC verification, nonce management, shop validation, and access token services
- **Application Layer**: OAuth use case orchestration
- **Routes**: HTTP endpoints for install and callback

## Architecture

The implementation uses Effect-TS Clean Architecture patterns with proper dependency injection and error handling.

### Domain Layer (`src/domain/global/shopify/oauth/`)

- **models.ts**: Branded types, schemas, and error definitions
- **service.ts**: Abstract service interfaces using Context.Tag pattern

### Infrastructure Layer (`src/infrastructure/shopify/oauth/`)

- **hmac.ts**: HMAC verification using Web Crypto API
- **durableObject.ts**: Durable Object with SQLite for nonce and token management
- **shop.ts**: Shop domain validation

### Application Layer (`src/application/global/shopify/oauth/`)

- **service.ts**: OAuth use case implementation

## Configuration

### Environment Variables

Add these to your `.dev.vars` and wrangler configuration:

```bash
SHOPIFY_CLIENT_ID=your-shopify-client-id
SHOPIFY_CLIENT_SECRET=your-shopify-client-secret
```

### Durable Object

The implementation uses a Durable Object with SQLite for storing nonces and access tokens:

```json
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SHOPIFY_OAUTH_DO",
        "class_name": "ShopifyOAuthDO"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v2",
      "new_classes": ["ShopifyOAuthDO"],
      "new_sqlite_classes": ["ShopifyOAuthDO"]
    }
  ]
}
```

### Shopify Partner Dashboard

Configure your app in the Shopify Partner Dashboard:

- **App URL**: `https://nimblers.com/`
- **Allowed redirection URL**: `https://nimblers.com/shopify/oauth/callback`

## Routes

### Install Route: `/shopify/oauth/install`

Handles initial app installation requests from Shopify.

**Query Parameters:**

- `shop`: The shop domain (e.g., `example.myshopify.com`)
- `hmac`: HMAC signature for verification
- `timestamp`: Request timestamp
- `embedded`: Whether the app is embedded (`1` or `0`)

**Flow:**

1. Validates and verifies HMAC signature
2. Checks for existing access token
3. Generates nonce for CSRF protection
4. Builds authorization URL
5. Handles iframe escape for embedded apps using Shopify App Bridge

### Callback Route: `/shopify/oauth/callback`

Handles the OAuth callback from Shopify after user authorization.

**Query Parameters:**

- `shop`: The shop domain
- `code`: Authorization code from Shopify
- `state`: Nonce for CSRF verification
- `hmac`: HMAC signature for verification
- `timestamp`: Request timestamp

**Flow:**

1. Validates and verifies HMAC signature
2. Verifies and consumes nonce
3. Exchanges authorization code for access token
4. Stores access token in Durable Object SQLite
5. Redirects to shop admin

## Security Features

### HMAC Verification

All requests are verified using HMAC-SHA256 with your client secret:

```typescript
const isValid =
  yield * hmacVerifier.verifyInstallRequest(installRequest, clientSecret);
```

### Nonce Management

CSRF protection using time-limited nonces stored in Durable Object SQLite:

```typescript
const nonce = yield * nonceManager.generate();
yield * nonceManager.store(nonce); // 10-minute expiration
```

### Shop Domain Validation

Ensures shop domains match Shopify's format:

```typescript
const shop = yield * shopValidator.validateShopDomain(shopDomain);
```

## Storage Architecture

### Why Durable Objects + SQLite vs KV?

**Advantages of Durable Objects + SQLite:**

- **Strong consistency**: Perfect for nonce verification/consumption
- **ACID transactions**: Atomic nonce verification and consumption
- **Relational queries**: Can store shop data, tokens, and nonces together
- **Better performance**: In-memory SQLite with persistence
- **Simpler architecture**: One storage system instead of KV + separate token storage

**Previous KV Implementation Issues:**

- **Eventual consistency**: Could lead to race conditions
- **No transactions**: Couldn't atomically verify and consume nonces
- **Limited querying**: Couldn't easily query by patterns or ranges
- **Separate storage**: Access tokens and nonces were in different logical spaces

### SQLite Schema

The Durable Object automatically creates these tables:

```sql
-- Nonces table for CSRF protection
CREATE TABLE nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  consumed BOOLEAN DEFAULT FALSE
);

-- Access tokens table for shop authentication
CREATE TABLE access_tokens (
  shop TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## Error Handling

The implementation includes comprehensive error handling:

- `OAuthError`: General OAuth-related errors
- `InvalidHmacError`: HMAC verification failures
- `InvalidNonceError`: Nonce verification failures
- `AccessTokenError`: Token exchange/storage errors

## Testing

Use the test function to verify the implementation:

```typescript
import { testShopifyOAuth } from "@/app/pages/shopify/test";

const result = await testShopifyOAuth();
console.log(result);
```

## Comparison with RedwoodSDK Session Management

While RedwoodSDK provides excellent session management for user authentication, the Shopify OAuth implementation requires different patterns:

| Aspect          | RedwoodSDK Sessions           | Shopify OAuth              |
| --------------- | ----------------------------- | -------------------------- |
| **Purpose**     | User authentication sessions  | OAuth state management     |
| **Lifetime**    | Long-lived (days/weeks)       | Short-lived (10 minutes)   |
| **Usage**       | Persistent user state         | Single-use CSRF protection |
| **Storage**     | D1 Database + Durable Objects | Durable Object SQLite      |
| **Consistency** | Eventually consistent         | Strongly consistent        |

The OAuth nonce pattern is specifically designed for preventing CSRF attacks in OAuth flows, which is different from user session management.

## Embedded Apps

The implementation supports both embedded and standalone apps:

- **Embedded apps**: Uses Shopify App Bridge to escape iframe
- **Standalone apps**: Direct redirects

## Scopes

Configure the required scopes in the use case:

```typescript
const scopes = ["read_products", "write_products"] as Scope[];
```

## Access Token Storage

Access tokens are stored in Durable Object SQLite with metadata:

```json
{
  "token": "shpat_...",
  "scope": "read_products,write_products",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Development

1. Set up environment variables
2. Create Durable Object
3. Configure Shopify Partner Dashboard
4. Run `npx wrangler types` to generate types
5. Test with development shop

## Production Deployment

1. Update environment variables in production
2. Create production Durable Object
3. Update Shopify Partner Dashboard URLs
4. Deploy with `npx wrangler deploy`

## Troubleshooting

### Common Issues

1. **HMAC verification fails**: Check client secret configuration
2. **Nonce errors**: Ensure Durable Object is properly configured
3. **Redirect issues**: Verify URLs in Partner Dashboard match implementation
4. **Type errors**: Run `npx wrangler types` after configuration changes

### Debugging

Enable Effect tracing to debug issues:

```typescript
Effect.withSpan("ShopifyOAuthUseCase.handleInstallRequest");
```

## References

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Effect-TS Documentation](https://effect.website/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
