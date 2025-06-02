# Honeycomb Integration Setup

This document describes how to set up OpenTelemetry tracing with Honeycomb for the Nimblers application.

## Overview

The application uses Effect-TS's built-in OpenTelemetry support to send traces to Honeycomb. All invitation workflows and critical operations are automatically instrumented with distributed tracing.

## Environment Configuration

Set the following environment variables in your `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "HONEYCOMB_API_KEY": "your-honeycomb-api-key",
    "HONEYCOMB_DATASET": "nimblers",
    "OTEL_SERVICE_NAME": "nimblers-worker",
    "OTEL_SERVICE_VERSION": "1.0.0",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://api.honeycomb.io/v1/traces",
    "OTEL_EXPORTER_OTLP_HEADERS": "x-honeycomb-team=your-honeycomb-api-key"
  }
}
```

### Key Configuration Notes

⚠️ **Important**: The endpoint must include `/v1/traces` path. Using just `https://api.honeycomb.io` will not work.

## Implementation

### Tracing Layer

The tracing layer is defined in `src/tracing.ts`:

```typescript
export const Tracing = OtlpTracer.layer({
  url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}`,
  headers: Object.fromEntries(
    env.OTEL_EXPORTER_OTLP_HEADERS.split(",").map((h) => h.split("=", 2))
  ),
  resource: {
    serviceName: env.OTEL_SERVICE_NAME ?? "nimblers-worker",
    serviceVersion: env.OTEL_SERVICE_VERSION ?? "1.0.0",
  },
}).pipe(Layer.provide(FetchHttpClient.layer));
```

### Usage in Server Actions

Server actions automatically provide the tracing layer at the top level:

```typescript
export async function inviteUserAction(
  prevState: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  const program = pipe(
    Effect.gen(function* () {
      // Business logic with automatic tracing
      const user = yield* Effect.withSpan("validate-user", {
        attributes: {
          "user.authenticated": prevState.user ? "true" : "false",
          "user.id": prevState.user?.id || "unknown",
        },
      })(validateUser(prevState.user));

      // More traced operations...
    }),
    Effect.withSpan("invite-user-action", {
      attributes: {
        "action.type": "invite-user",
        "organization.slug": organizationSlug,
      },
    })
  );

  // Provide tracing layer at the highest level
  return Effect.runPromise(program.pipe(Effect.provide(Tracing)));
}
```

## Instrumented Operations

The following operations are currently instrumented with tracing:

### Invitation Workflows

- **invite-user-action**: Complete invitation creation flow
- **validate-user**: User authentication validation
- **validate-form-data**: Form input validation
- **create-invitation-in-do**: Durable Object invitation creation
- **accept-invitation-action**: Complete invitation acceptance flow
- **verify-invitation-token**: Token verification
- **get-invitation**: Invitation retrieval
- **accept-invitation-atomic**: Atomic acceptance operations

### Custom Attributes

Each span includes relevant attributes for debugging and observability:

- User IDs and authentication status
- Organization slugs and context
- Invitation details (email, role, status)
- Validation results and error details
- Processing times and operation metadata

## Verification

✅ **Status**: Integration verified working as of 2025-06-02

To verify tracing is working:

1. Trigger an invitation creation or acceptance
2. Check Honeycomb for traces with service name `nimblers-worker`
3. Look for span names like `invite-user-action` and `accept-invitation-action`

## Troubleshooting

### Common Issues

1. **No traces appearing**: Verify the endpoint includes `/v1/traces` path
2. **Authentication errors**: Check that `x-honeycomb-team` header matches your API key
3. **Missing spans**: Ensure `Effect.provide(Tracing)` is at the top level of your program

### Key Fix

The primary issue was using `https://api.honeycomb.io` instead of `https://api.honeycomb.io/v1/traces` for the OTLP endpoint. Honeycomb requires the full path for trace ingestion.

## Next Steps

1. Add tracing to more critical workflows (organization management, Shopify integration)
2. Implement trace-based alerting for error conditions
3. Create Honeycomb dashboards for key business metrics
4. Add sampling configuration for high-volume operations
