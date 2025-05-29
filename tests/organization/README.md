# Organization API Pattern Matching Tests

This test suite demonstrates the implementation and benefits of using Effect-TS pattern matching in the organization Durable Object client.

## Overview

We replaced traditional `if/else` chains with Effect's `Match` module for handling different URL input types (`string | URL | Request`) in our DO client implementation.

## Pattern Matching Implementation

### Before (Traditional Approach)

```typescript
const extractUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  } else if (input instanceof URL) {
    return input.toString();
  } else if (input instanceof Request) {
    return input.url;
  } else {
    throw new Error("Unhandled input type");
  }
};
```

### After (Effect Pattern Matching)

```typescript
const extractUrl = (input: RequestInfo | URL): string => {
  return Match.value(input).pipe(
    Match.when(Match.string, (str) => str),
    Match.when(
      (input): input is URL => input instanceof URL,
      (url) => url.toString()
    ),
    Match.when(
      (input): input is Request => input instanceof Request,
      (request) => request.url
    ),
    Match.exhaustive // Ensures all cases are handled at compile time
  );
};
```

## Benefits of Pattern Matching

### 🔒 **Compile-Time Exhaustiveness Checking**

- `Match.exhaustive` ensures TypeScript validates that all cases are handled
- Prevents runtime errors from unhandled cases
- Catches missing cases during build, not runtime

### 🎯 **Type Safety**

- Better type inference throughout the pipeline
- Eliminates manual type guards and assertions
- TypeScript compiler enforces correctness

### 🔧 **Functional Programming Style**

- Immutable, side-effect free operations
- Composable and predictable behavior
- Easy to test and reason about

### 🚀 **Integration with Effect Ecosystem**

- Works seamlessly with other Effect patterns
- Composable with `Effect.gen` and other Effect utilities
- Consistent with Effect-TS architectural patterns

## Test Coverage

### Core Pattern Matching Tests

- ✅ String URL handling
- ✅ URL object handling
- ✅ Request object handling
- ✅ Query parameters preservation
- ✅ URL fragments handling
- ✅ Complex URL encoding

### URL Transformation Logic

- ✅ Internal URL transformation
- ✅ Query parameter preservation
- ✅ Root path handling
- ✅ Multiple endpoint types

### Performance Tests

- ✅ Efficient pattern matching (< 50ms for 5 operations)
- ✅ Concurrent operations (300 operations simultaneously)
- ✅ Memory efficiency validation

### Type Safety Tests

- ✅ Compile-time exhaustiveness checking
- ✅ Edge case handling
- ✅ Type narrowing validation

### Effect Integration Tests

- ✅ `Effect.gen` context integration
- ✅ Error handling in Effect context
- ✅ Effect pipeline composition

### Benefits Demonstration

- ✅ Type safety comparison with traditional approach
- ✅ Functional programming benefits
- ✅ Immutability and predictability

## Usage in Production Code

The pattern matching is used in the organization DO client:

```typescript
// src/infrastructure/cloudflare/durable-objects/organization/api/client.ts
const doFetcher = (input: RequestInfo | URL, init?: RequestInit) => {
  // Handle both URL and Request objects using Effect's pattern matching
  const url = Match.value(input).pipe(
    Match.when(Match.string, (str) => str),
    Match.when(
      (input): input is URL => input instanceof URL,
      (url) => url.toString()
    ),
    Match.when(
      (input): input is Request => input instanceof Request,
      (request) => request.url
    ),
    Match.exhaustive // Ensures all cases are handled at compile time
  );

  const transformedUrl = `http://internal${new URL(url).pathname}${
    new URL(url).search
  }`;
  return stub.fetch(transformedUrl, init);
};
```

## Running Tests

```bash
# Run pattern matching tests
npm test tests/organization/pattern-matching.test.ts

# Expected output: 19 tests passing
# Coverage: URL handling, transformation, performance, type safety, Effect integration
```

## Integration with TypeOnce.dev Pattern

This pattern matching approach is part of our broader TypeOnce.dev implementation where:

1. **Single API Definition**: `organizationApi` in handlers.ts defines all endpoints
2. **Auto-Generated Client**: `HttpApiClient.make(organizationApi, { baseUrl })` creates type-safe methods
3. **Pattern Matching**: Handles URL transformation for Durable Object routing
4. **Type Safety**: End-to-end type safety from API definition to client usage

The pattern matching ensures that our custom DO fetcher correctly handles all possible URL input types while maintaining the same interface as the standard fetch API.

## Architecture Benefits

- **Maintainability**: Single pattern for URL handling across all DO clients
- **Reliability**: Compile-time validation prevents runtime errors
- **Consistency**: Same pattern used throughout the Effect-TS architecture
- **Performance**: Efficient pattern matching with minimal overhead
- **Developer Experience**: Clear, readable code with excellent IDE support
