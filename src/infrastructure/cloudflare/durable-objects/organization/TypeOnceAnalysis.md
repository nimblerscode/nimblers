# TypeOnce.dev Pattern Analysis for Durable Objects

## Overview

The [TypeOnce.dev pattern](https://www.typeonce.dev/course/paddle-payments-full-stack-typescript-app/client-implementation/effect-services-and-runtime) demonstrates a powerful approach where **a single API definition serves both client and server**, providing automatic type safety and IDE auto-complete.

## Key Insight: Shared API Definition

The magic happens when you export your `HttpApi` definition and use `HttpApiClient.make()` to automatically generate a type-safe client:

```typescript
// Server side (handlers.ts)
const api = HttpApi.make("organizationApi").add(organizationsGroup);
export { api as organizationApi }; // ← Export for client use

// Client side
const client = yield * HttpApiClient.make(organizationApi, { baseUrl });
// ↑ Auto-generates methods with perfect type safety!
```

## Benefits from TypeOnce.dev Pattern

1. **Single Source of Truth**: API definition serves both client and server
2. **Automatic Type Safety**: `HttpApiClient.make()` infers all types from the API definition
3. **Auto-complete**: IDE provides full auto-complete for endpoints, parameters, and responses
4. **No Manual Client Code**: Client methods are generated automatically
5. **Perfect Consistency**: Impossible to have mismatches between client and server

## Current State vs TypeOnce.dev Pattern

### What You Have Now ✅

```typescript
// ✅ Shared schemas (great foundation!)
export const OrganizationApiSchemas = {
  createOrganization: {
    request: Schema.Struct({ ... }),
    response: OrganizationSchema,
  },
  // ... more schemas
};

// ✅ API definition using shared schemas
const api = HttpApi.make("organizationApi").add(organizationsGroup);
```

### Manual Client (Current Approach)

```typescript
// ❌ Manual client creation - error prone
export function createOrganizationDOClient(stub: DurableObjectStub) {
  return {
    createOrganization: (request) =>
      client.post("/organization", requestSchema, responseSchema)(request),
    getOrganization: (slug) =>
      client.get(`/organization/${slug}`, responseSchema)(),
    // ... manually define every method
  };
}
```

### TypeOnce.dev Pattern (Target Approach)

```typescript
// ✅ Auto-generated client - perfect type safety
export const createOrganizationDOClient = (stub: DurableObjectStub) => {
  return HttpApiClient.make(organizationApi, {
    baseUrl: "http://internal",
    fetch: (request) => stub.fetch(request), // Custom DO fetcher
  });
};

// Usage with perfect auto-complete:
const client = yield * createOrganizationDOClient(stub);
const org =
  yield *
  client.organizations.getOrganization({
    path: { organizationSlug: "my-org" },
  });
// ↑ IDE knows all parameters, response types, and possible errors!
```

## Implementation Steps

### Step 1: Export API Definition ✅ DONE

```typescript
// In handlers.ts
export { api as organizationApi };
```

### Step 2: Create TypeOnce.dev Style Client

```typescript
import { HttpApiClient } from "@effect/platform";
import { organizationApi } from "./api/handlers";

export const createOrganizationDOClient = (stub: DurableObjectStub) => {
  return Effect.gen(function* () {
    const doFetcher = (request: Request) => {
      const url = new URL(request.url);
      const internalUrl = `http://internal${url.pathname}${url.search}`;
      return stub.fetch(internalUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    };

    return yield* HttpApiClient.make(organizationApi, {
      baseUrl: "http://internal",
    }).pipe(Effect.provide(Layer.succeed(HttpApiClient.Fetch, doFetcher)));
  });
};
```

### Step 3: Update Usage in OrganizationDONameSpace.ts

```typescript
// BEFORE (manual client)
const client = createOrganizationDOClient(stub);
const org = yield * client.getOrganization(slug);

// AFTER (TypeOnce.dev pattern)
const client = yield * createOrganizationDOClient(stub);
const org =
  yield *
  client.organizations.getOrganization({
    path: { organizationSlug: slug },
  });
```

## Comparison: Manual vs TypeOnce.dev

| Aspect         | Manual Client          | TypeOnce.dev Pattern          |
| -------------- | ---------------------- | ----------------------------- |
| Type Safety    | Manual type assertions | Automatic type inference      |
| Auto-complete  | Limited                | Full IDE support              |
| Maintenance    | Update client + server | Update API definition only    |
| Consistency    | Prone to drift         | Guaranteed consistency        |
| Client Code    | ~100+ lines            | ~10 lines                     |
| Error Handling | Manual mapping         | Automatic from API definition |

## Real-World Example: Creating an Organization

### Manual Approach (Current)

```typescript
// Manual client method
createOrganization: (request: CreateOrganizationRequest) =>
  client.post(
    "/organization",
    OrganizationApiSchemas.createOrganization.request,
    OrganizationApiSchemas.createOrganization.response
  )(request),

// Usage
const org = yield* client.createOrganization({
  organization: { name: "Acme Corp", slug: "acme" },
  userId: "user123"
});
```

### TypeOnce.dev Approach (Target)

```typescript
// No client method definition needed - auto-generated!

// Usage with perfect type safety
const org =
  yield *
  client.organizations.createOrganization({
    payload: {
      organization: { name: "Acme Corp", slug: "acme" },
      userId: "user123",
    },
  });
// ↑ Full auto-complete for payload structure
// ↑ Response type automatically inferred
// ↑ Error types automatically handled
```

## Migration Strategy

1. **Phase 1** ✅: Export API definition from handlers
2. **Phase 2**: Create TypeOnce.dev client alongside existing manual client
3. **Phase 3**: Update one service method at a time to use new client
4. **Phase 4**: Remove manual client code once migration is complete

## Challenges with Current Effect-TS Version

The Effect-TS Service API has evolved, and some patterns from the TypeOnce.dev article may need adaptation for current versions. The core concept remains valid:

- **Shared API definition** ✅ Fully applicable
- **HttpApiClient.make()** ✅ Still the right approach
- **Service syntax** ⚠️ May need updates for current Effect version

## Next Steps

1. Experiment with `HttpApiClient.make()` using your exported `organizationApi`
2. Test the client with a simple endpoint first
3. Gradually migrate from manual client to auto-generated client
4. Apply the same pattern to other DO services (Shopify OAuth, etc.)

## Key Takeaway

The TypeOnce.dev pattern eliminates the entire category of **client/server type mismatches** by using a single source of truth. This is exactly what you need for your Durable Object architecture!
