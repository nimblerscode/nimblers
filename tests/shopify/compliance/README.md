# Shopify Compliance Webhooks Tests

This directory contains comprehensive tests for the Shopify compliance webhooks implementation using Effect-TS and @effect/vitest.

## Test Structure

### 1. HMAC Verification Tests (`hmac.test.ts`)

- Tests the HMAC signature verification service
- Validates correct signature generation and verification
- Tests error handling for missing or invalid signatures
- Uses Effect-TS patterns with proper layer provision

### 2. Use Case Tests (`use-case.test.ts`)

- Tests the business logic layer (ShopifyComplianceUseCase)
- Uses mock dependencies to isolate the use case logic
- Tests all three webhook types: customer data request, customer erasure, shop erasure
- Validates error handling and payload validation
- Uses Effect-TS Layer.succeed for mocking dependencies

### 3. Server Action Tests (`action.test.ts`)

- Tests the server action that handles HTTP requests
- Tests the full request/response cycle
- Validates HTTP status codes and response bodies
- Tests configuration error handling
- Uses MSW for mocking external dependencies if needed

### 4. Integration Tests (`integration.test.ts`)

- End-to-end tests that test the complete flow
- Tests security validation (HMAC verification)
- Tests data validation and error handling
- Performance and edge case testing
- Tests concurrent request handling

## Running Tests

```bash
# Run all Shopify compliance tests
npm test tests/shopify/compliance

# Run specific test files
npm test tests/shopify/compliance/hmac.test.ts
npm test tests/shopify/compliance/use-case.test.ts
npm test tests/shopify/compliance/action.test.ts
npm test tests/shopify/compliance/integration.test.ts

# Run tests in watch mode
npm test -- --watch tests/shopify/compliance

# Run tests with coverage
npm test -- --coverage tests/shopify/compliance
```

## Test Environment Setup

The tests use the following setup:

1. **@effect/vitest**: For Effect-TS compatible testing utilities
2. **MSW (Mock Service Worker)**: For mocking external HTTP requests
3. **Web Crypto API**: For HMAC signature generation in tests
4. **Environment Variables**: Tests set `SHOPIFY_WEBHOOK_SECRET` for testing

## Test Data

The tests use realistic Shopify webhook payloads:

### Customer Data Request Payload

```json
{
  "shop_id": 12345,
  "shop_domain": "test-shop.myshopify.com",
  "orders_requested": [1001, 1002],
  "customer": {
    "id": 67890,
    "email": "customer@example.com",
    "phone": "+1234567890"
  }
}
```

### Customer Data Erasure Payload

```json
{
  "shop_id": 12345,
  "shop_domain": "test-shop.myshopify.com",
  "customer": {
    "id": 67890,
    "email": "customer@example.com"
  }
}
```

### Shop Data Erasure Payload

```json
{
  "shop_id": 12345,
  "shop_domain": "test-shop.myshopify.com"
}
```

## Effect-TS Testing Patterns

The tests demonstrate several Effect-TS testing patterns:

### 1. Using it.scoped for Effect Tests

```typescript
it.scoped("should verify valid HMAC signature", () =>
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyHmacVerifier;
    const result = yield* hmacVerifier.verify(request, secret);
    expect(result).toBe(true);
  }).pipe(Effect.provide(ShopifyHmacVerifierLive))
);
```

### 2. Mocking Dependencies with Layer.succeed

```typescript
const MockHmacVerifier = Layer.succeed(ShopifyHmacVerifier, {
  verify: () => Effect.succeed(true),
});
```

### 3. Error Testing with Effect.either

```typescript
const result =
  yield *
  Effect.either(
    useCase.handleWebhook("customers-data-request", request, secret)
  );

expect(result._tag).toBe("Left");
if (result._tag === "Left") {
  const error = result.left as WebhookProcessingError;
  expect(error._tag).toBe("WebhookProcessingError");
}
```

### 4. Layer Composition for Testing

```typescript
Effect.provide(
  Layer.mergeAll(
    ShopifyComplianceUseCaseLive,
    MockHmacVerifierValid,
    MockDataRepo,
    MockLogger
  )
);
```

## Test Coverage

The tests cover:

- ✅ HMAC signature verification (valid/invalid/missing)
- ✅ Payload validation for all webhook types
- ✅ Error handling and proper error types
- ✅ HTTP status codes and response formats
- ✅ Configuration error handling
- ✅ Malformed JSON handling
- ✅ Security validation
- ✅ Performance testing
- ✅ Concurrent request handling
- ✅ Edge cases and special characters

## Extending Tests

When adding new features to the compliance webhooks:

1. Add unit tests for new services in their respective test files
2. Add integration tests for new webhook types
3. Update mock dependencies if new services are added
4. Add performance tests for new complex operations
5. Follow Effect-TS testing patterns for consistency
