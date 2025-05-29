# Shopify OAuth Tests

This directory contains comprehensive tests for the Shopify OAuth implementation using Effect-TS and @effect/vitest.

## Overview

The OAuth tests cover the complete Shopify OAuth authorization code grant flow implementation:

- **Domain Models**: Branded types, schemas, and error validation
- **Infrastructure Services**: HMAC verification, shop validation, nonce management, access token services
- **Use Case Logic**: OAuth flow orchestration and business logic
- **HTTP Routes**: Install and callback endpoint handling
- **Integration**: End-to-end OAuth flow testing

## Test Structure

### 1. Domain Model Tests (`models.test.ts`)

- Tests branded type validation (ShopDomain, ClientId, etc.)
- Schema validation for OAuth requests and responses
- Error type construction and serialization
- Edge cases for domain validation

### 2. HMAC Verification Tests (`hmac.test.ts`)

- Tests Web Crypto API HMAC-SHA256 signature generation
- Validates install request HMAC verification
- Validates callback request HMAC verification
- Tests constant-time comparison security
- Error handling for crypto operations

### 3. Shop Validation Tests (`shop.test.ts`)

- Tests shop domain format validation
- Valid/invalid .myshopify.com domain patterns
- Schema validation integration
- Error message validation

### 4. Nonce Management Tests (`nonce.test.ts`)

- Tests nonce generation (crypto.randomUUID)
- Nonce storage and retrieval via Durable Object
- Nonce verification and consumption (single-use)
- Expiration and cleanup logic
- Concurrent nonce operations

### 5. Access Token Tests (`access-token.test.ts`)

- Tests OAuth code-to-token exchange with Shopify API
- Token storage and retrieval via Durable Object
- Token validation and expiration
- Scope handling
- Error handling for API failures

### 6. Use Case Tests (`use-case.test.ts`)

- Tests complete OAuth install request handling
- Tests OAuth callback processing
- Tests authorization URL generation
- Tests connection status checking
- Tests disconnect functionality
- Uses mock dependencies for isolation

### 7. Route Handler Tests (`routes.test.ts`)

- Tests HTTP endpoints (/oauth/install, /oauth/callback, /status, /disconnect)
- Request/response validation
- Error handling and status codes
- Redirect behavior
- Query parameter handling

### 8. Integration Tests (`integration.test.ts`)

- End-to-end OAuth flow testing
- HMAC security validation
- Durable Object state persistence
- Error scenarios and recovery
- Performance testing
- Concurrent user flows

## Running Tests

```bash
# Run all Shopify OAuth tests
npm test tests/shopify/oauth

# Run specific test files
npm test tests/shopify/oauth/models.test.ts
npm test tests/shopify/oauth/hmac.test.ts
npm test tests/shopify/oauth/use-case.test.ts
npm test tests/shopify/oauth/integration.test.ts

# Run tests in watch mode
npm test -- --watch tests/shopify/oauth

# Run tests with coverage
npm test -- --coverage tests/shopify/oauth
```

## Test Environment Setup

### Environment Variables

```bash
# .test.vars (for testing)
SHOPIFY_CLIENT_ID=test_client_id_12345
SHOPIFY_CLIENT_SECRET=test_client_secret_67890
```

### Dependencies

- **@effect/vitest**: Effect-TS compatible testing utilities
- **MSW (Mock Service Worker)**: For mocking Shopify API calls
- **Web Crypto API**: Available in test environment for HMAC operations
- **SQLite**: In-memory database for Durable Object testing

## Test Data

### Valid OAuth Install Request

```json
{
  "shop": "test-shop.myshopify.com",
  "timestamp": "1234567890",
  "hmac": "d3b5c7e8a1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "embedded": "1"
}
```

### Valid OAuth Callback Request

```json
{
  "code": "auth_code_12345",
  "hmac": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
  "shop": "test-shop.myshopify.com",
  "state": "nonce_abc123",
  "timestamp": "1234567890"
}
```

### Shopify Token Response

```json
{
  "access_token": "shpat_12345abcdef67890",
  "scope": "read_products,write_products"
}
```

## Effect-TS Testing Patterns

### 1. Using it.scoped for Effect Tests

```typescript
it.scoped("should verify valid HMAC signature", () =>
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyOAuthHmacVerifier;
    const result = yield* hmacVerifier.verifyInstallRequest(request, secret);
    expect(result).toBe(true);
  }).pipe(Effect.provide(ShopifyOAuthHmacVerifierLive))
);
```

### 2. Mocking Dependencies with Layer.succeed

```typescript
const MockAccessTokenService = Layer.succeed(AccessTokenService, {
  exchangeCodeForToken: () =>
    Effect.succeed({
      access_token: "test_token" as AccessToken,
      scope: "read_products" as Scope,
    }),
  store: () => Effect.succeed(void 0),
  retrieve: () => Effect.succeed("test_token" as AccessToken),
});
```

### 3. Error Testing with Effect.either

```typescript
const result =
  yield * Effect.either(useCase.handleInstallRequest(invalidRequest));

expect(result._tag).toBe("Left");
if (result._tag === "Left") {
  expect(result.left).toBeInstanceOf(InvalidHmacError);
}
```

### 4. Testing Durable Objects

```typescript
// Mock Durable Object for testing
const MockShopifyOAuthDO = {
  fetch: (request: Request) => {
    // Mock implementation
    return Promise.resolve(new Response(JSON.stringify({ success: true })));
  },
};
```

### 5. HTTP Response Testing

```typescript
it.scoped("should redirect to Shopify authorization", () =>
  Effect.gen(function* () {
    const response = yield* useCase.handleInstallRequest(validRequest);

    expect(response.status).toBe(302);
    const location = response.headers.get("Location");
    expect(location).toContain(
      "https://test-shop.myshopify.com/admin/oauth/authorize"
    );
    expect(location).toContain("client_id=test_client_id");
  })
);
```

## Security Testing

### HMAC Verification

- Tests valid HMAC signatures from Shopify
- Tests tampered parameters detection
- Tests missing HMAC handling
- Tests constant-time comparison (timing attack prevention)

### Nonce Security

- Tests single-use nonce consumption
- Tests nonce expiration
- Tests replay attack prevention
- Tests concurrent nonce usage

### Shop Domain Validation

- Tests malicious domain rejection
- Tests subdomain validation
- Tests international domain handling

## Performance Testing

- Concurrent OAuth request handling
- HMAC verification performance
- Database operation optimization
- Memory usage during token storage

## Test Coverage Requirements

- ✅ All domain models and schemas
- ✅ HMAC verification (valid/invalid/tampered)
- ✅ Shop domain validation
- ✅ Nonce generation, storage, verification, consumption
- ✅ Access token exchange, storage, retrieval
- ✅ OAuth use case orchestration
- ✅ HTTP route handling
- ✅ Error scenarios and recovery
- ✅ Security edge cases
- ✅ Performance and concurrency

## Extending Tests

When adding new OAuth features:

1. Add unit tests for new domain models
2. Add service tests for new infrastructure components
3. Add use case tests for new business logic
4. Add integration tests for new endpoints
5. Update mock dependencies as needed
6. Add security tests for new attack vectors
7. Follow Effect-TS testing patterns for consistency
