# Shopify Compliance Webhooks

This document explains how to configure and implement Shopify's mandatory compliance webhooks for your app using Effect-TS Clean Architecture.

## Overview

Shopify requires all public apps to implement three mandatory compliance webhooks to handle data privacy requests:

1. **Customer Data Request** (`customers/data_request`)
2. **Customer Data Erasure** (`customers/redact`)
3. **Shop Data Erasure** (`shop/redact`)

## Architecture

This implementation follows Effect-TS Clean Architecture patterns with proper separation of concerns:

### Domain Layer (`src/domain/global/shopify/compliance/`)

- **Models**: Branded types, schemas, and error definitions
- **Service**: Abstract interfaces using `Context.Tag`

### Application Layer (`src/application/global/shopify/compliance/`)

- **Service**: Use case implementation with business logic orchestration

### Infrastructure Layer (`src/infrastructure/shopify/compliance/`)

- **HMAC Verification**: Web Crypto API implementation
- **Data Repository**: Placeholder for data operations
- **Logger**: Compliance logging service

### Configuration Layer (`src/config/shopify.ts`)

- **Layers**: Effect layers that wire dependencies together

### Actions Layer (`src/app/actions/shopify/compliance.ts`)

- **Server Actions**: Request handlers that orchestrate use cases

## Configuration

### 1. Environment Variables

Add your Shopify webhook secret to your environment configuration:

```bash
# In your .env file or wrangler.jsonc vars section
SHOPIFY_WEBHOOK_SECRET=your-shopify-webhook-secret-here
```

### 2. Webhook Endpoints

The following endpoints are configured in your application:

- `https://nimblers.dev/shopify/privacy/customers-data-request`
- `https://nimblers.dev/shopify/privacy/customers-data-erasure`
- `https://nimblers.dev/shopify/privacy/shop-data-erasure`

### 3. Shopify Partner Dashboard Configuration

In your Shopify Partner Dashboard:

1. Go to **Apps** → Your App → **Configuration** → **Compliance webhooks**
2. Add the webhook URLs above
3. Ensure your webhook secret matches the one in your environment variables

### 4. App Configuration (shopify.app.toml)

Add the compliance webhooks to your `shopify.app.toml` file:

```toml
[webhooks]
api_version = "2025-04"

[[webhooks.compliance]]
topic = "customers/data_request"
uri = "https://nimblers.dev/shopify/privacy/customers-data-request"

[[webhooks.compliance]]
topic = "customers/redact"
uri = "https://nimblers.dev/shopify/privacy/customers-data-erasure"

[[webhooks.compliance]]
topic = "shop/redact"
uri = "https://nimblers.dev/shopify/privacy/shop-data-erasure"
```

## Implementation Details

### Effect-TS Architecture

The implementation uses Effect-TS patterns for:

- **Type Safety**: Branded types and schema validation
- **Error Handling**: Tagged errors with proper error mapping
- **Dependency Injection**: Context.Tag for service dependencies
- **Observability**: Effect.withSpan for tracing
- **Composability**: Layer composition for dependency wiring

### HMAC Verification

All webhooks are automatically verified using HMAC-SHA256 signatures:

```typescript
// Domain service interface
export abstract class ShopifyHmacVerifier extends Context.Tag(
  "@core/shopify/HmacVerifier"
)<
  ShopifyHmacVerifier,
  {
    readonly verify: (
      request: Request,
      secret: string
    ) => Effect.Effect<boolean, InvalidHmacError>;
  }
>() {}
```

### Webhook Handlers

Each webhook type has its own handler with proper schema validation:

```typescript
// Application use case
export const ShopifyComplianceUseCaseLive = Layer.effect(
  ShopifyComplianceUseCase,
  Effect.gen(function* () {
    const hmacVerifier = yield* ShopifyHmacVerifier;
    const dataRepo = yield* ComplianceDataRepo;
    const logger = yield* ComplianceLogger;

    return {
      handleWebhook: (webhookType: WebhookType, request: Request, secret: string) =>
        Effect.gen(function* () {
          // 1. Verify HMAC signature
          const isValid = yield* hmacVerifier.verify(request, secret);

          // 2. Parse and validate payload
          const rawPayload = yield* Effect.tryPromise({
            try: () => request.json(),
            catch: (error) => new WebhookProcessingError({...})
          });

          // 3. Handle based on webhook type with schema validation
          // ...
        })
    };
  })
);
```

### Data Operations

The compliance data repository provides interfaces for:

- **Customer Data Retrieval**: Compile and send customer data to store owners
- **Customer Data Deletion**: Delete or anonymize customer data
- **Shop Data Deletion**: Remove all shop-related data

```typescript
export abstract class ComplianceDataRepo extends Context.Tag(
  "@core/shopify/ComplianceDataRepo"
)<
  ComplianceDataRepo,
  {
    readonly retrieveCustomerData: (
      payload: CustomerDataRequestPayload
    ) => Effect.Effect<unknown, ShopifyWebhookError>;

    readonly deleteCustomerData: (
      payload: CustomerRedactPayload
    ) => Effect.Effect<void, ShopifyWebhookError>;

    readonly deleteShopData: (
      payload: ShopRedactPayload
    ) => Effect.Effect<void, ShopifyWebhookError>;
  }
>() {}
```

## Extending the Implementation

### Adding Database Operations

To implement actual data operations, extend the `ComplianceDataRepoLive`:

```typescript
// Add database dependencies
export const ComplianceDataRepoLive = Layer.effect(
  ComplianceDataRepo,
  Effect.gen(function* () {
    const db = yield* DrizzleD1Client; // Add database dependency

    return {
      retrieveCustomerData: (payload: CustomerDataRequestPayload) =>
        Effect.gen(function* () {
          // Query customer data from database
          const customerData = yield* Effect.tryPromise({
            try: () => db.select().from(customers).where(eq(customers.shopifyId, payload.customer.id)),
            catch: (error) => new ShopifyWebhookError({...})
          });

          // Send to store owner
          yield* sendDataToStoreOwner(payload.shop_domain, customerData);

          return customerData;
        }),
      // ...
    };
  })
);
```

### Adding Email Notifications

Integrate with the existing email service:

```typescript
export const ComplianceDataRepoLive = Layer.effect(
  ComplianceDataRepo,
  Effect.gen(function* () {
    const emailService = yield* EmailService; // Add email dependency

    return {
      retrieveCustomerData: (payload: CustomerDataRequestPayload) =>
        Effect.gen(function* () {
          // ... retrieve data

          // Send email to store owner
          yield* emailService.sendEmail({
            to: `admin@${payload.shop_domain}`,
            subject: "Customer Data Request",
            body: formatCustomerDataEmail(customerData),
          });
        }),
      // ...
    };
  })
);
```

### Layer Configuration

Update the layer configuration to include new dependencies:

```typescript
export const ShopifyComplianceLayerLive = Layer.provide(
  ShopifyComplianceUseCaseLive,
  Layer.mergeAll(
    ShopifyHmacVerifierLive,
    ComplianceDataRepoLive.pipe(
      Layer.provide(DrizzleD1ClientLive),
      Layer.provide(EmailServiceLive)
    ),
    ComplianceLoggerLive
  )
);
```

## Testing

### Unit Testing with Effect

```typescript
import { Effect, Layer } from "effect";
import { ShopifyComplianceUseCase } from "@/domain/global/shopify/compliance/service";

const MockComplianceRepo = Layer.succeed(ComplianceDataRepo, {
  retrieveCustomerData: () => Effect.succeed(mockCustomerData),
  deleteCustomerData: () => Effect.succeed(undefined),
  deleteShopData: () => Effect.succeed(undefined),
});

test("should handle customer data request", async () => {
  const program = Effect.gen(function* () {
    const service = yield* ShopifyComplianceUseCase;
    yield* service.handleWebhook(
      "customers-data-request",
      mockRequest,
      "secret"
    );
  });

  await Effect.runPromise(program.pipe(Effect.provide(MockComplianceRepo)));
});
```

## Security Considerations

1. **HMAC Verification**: Always verify webhook signatures using constant-time comparison
2. **HTTPS Only**: Webhooks must use HTTPS endpoints
3. **Error Handling**: Don't expose internal details in error responses
4. **Logging**: Log all compliance requests for audit purposes
5. **Data Retention**: Understand legal requirements for data retention

## Response Requirements

- **Status Code**: Must return `200 OK` to acknowledge receipt
- **Response Time**: Must respond within 30 seconds
- **Content-Type**: `text/plain` is recommended
- **Body**: Simple "OK" message

## Compliance Timeline

- **Customer Data Request**: Provide data within 30 days
- **Customer Data Erasure**: Complete deletion within 30 days (unless legally required to retain)
- **Shop Data Erasure**: Complete deletion within 30 days

## Next Steps

1. **Implement Data Handlers**: Replace the TODO comments in the data repository with your actual data handling logic
2. **Add Database Integration**: Connect to your database for actual data operations
3. **Add Email Notifications**: Integrate with email service for store owner notifications
4. **Test Thoroughly**: Test all webhook endpoints before submitting for app review
5. **Review Legal Requirements**: Ensure compliance with data protection laws in your target markets

## References

- [Shopify Privacy Law Compliance Documentation](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Shopify Webhook Documentation](https://shopify.dev/docs/apps/webhooks)
- [Effect-TS Documentation](https://effect.website/)
- [GDPR Compliance Guide](https://shopify.dev/docs/apps/build/compliance/gdpr)
