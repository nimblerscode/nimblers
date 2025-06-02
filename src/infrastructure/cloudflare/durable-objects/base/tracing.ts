import { Effect } from "effect";
import { Tracing } from "@/tracing";

/**
 * Enhanced Durable Object Tracing Helpers
 *
 * This module builds on Effect-TS's native tracing APIs (Effect.withSpan, Effect.logError, etc.)
 * to provide domain-specific observability patterns for Durable Object operations.
 *
 * We're NOT reinventing the wheel - we use Effect's built-in OpenTelemetry integration
 * and add business-specific context, performance monitoring, and error handling patterns.
 *
 * Key Effect APIs we leverage:
 * - Effect.withSpan() for span creation
 * - Effect.logError/logWarning() for structured logging
 * - Effect.annotateLogs() for log context
 * - @effect/opentelemetry/OtlpTracer for OTLP export
 */

/**
 * Standardized tracing attributes for Durable Object API operations
 */
export interface DOApiAttributes {
  "do.type": "organization" | "shopify.oauth";
  "do.id": string;
  "api.endpoint": string;
  "api.method": "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  "api.operation": string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Enhanced tracing wrapper for Durable Object API handlers
 * Provides standardized span creation with DO-specific context
 */
export function withDOTracing<A, E, R>(
  spanName: string,
  attributes: DOApiAttributes,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.gen(function* () {
    // Add timing information
    const startTime = Date.now();

    const enhancedAttributes = {
      ...attributes,
      "trace.timestamp": new Date().toISOString(),
      "do.handler_start": startTime,
    };

    const result = yield* effect.pipe(
      Effect.withSpan(spanName, { attributes: enhancedAttributes }),
      Effect.tap(() =>
        Effect.gen(function* () {
          const duration = Date.now() - startTime;
          // Log performance metrics for monitoring
          if (duration > 1000) {
            yield* Effect.logWarning(
              `Slow DO operation: ${spanName} took ${duration}ms`
            ).pipe(
              Effect.annotateLogs({
                spanName,
                duration,
                ...enhancedAttributes,
              })
            );
          }
        })
      ),
      Effect.tapError((error) =>
        Effect.gen(function* () {
          const duration = Date.now() - startTime;
          yield* Effect.logError(`DO operation failed: ${spanName}`).pipe(
            Effect.annotateLogs({
              spanName,
              duration,
              error: error instanceof Error ? error.message : String(error),
              ...enhancedAttributes,
            })
          );
        })
      )
    );

    return result;
  });
}

/**
 * Creates organization DO specific tracing attributes
 */
export function createOrgDOAttributes(
  organizationSlug: string,
  endpoint: string,
  method: DOApiAttributes["api.method"],
  operation: string,
  additionalAttributes: Record<string, string | number | boolean> = {}
): DOApiAttributes {
  return {
    "do.type": "organization",
    "do.id": organizationSlug,
    "api.endpoint": endpoint,
    "api.method": method,
    "api.operation": operation,
    "organization.slug": organizationSlug,
    ...additionalAttributes,
  };
}

/**
 * Creates Shopify OAuth DO specific tracing attributes
 */
export function createShopifyOAuthDOAttributes(
  doId: string,
  endpoint: string,
  method: DOApiAttributes["api.method"],
  operation: string,
  additionalAttributes: Record<string, string | number | boolean> = {}
): DOApiAttributes {
  return {
    "do.type": "shopify.oauth",
    "do.id": doId,
    "api.endpoint": endpoint,
    "api.method": method,
    "api.operation": operation,
    ...additionalAttributes,
  };
}

/**
 * Middleware to provide tracing layer to DO handlers
 * Ensures all DO operations are traced with proper context
 */
export const DOTracingLayer = Tracing;

/**
 * Performance monitoring thresholds for DO operations
 */
export const DOPerformanceThresholds = {
  SLOW_OPERATION_MS: 1000,
  VERY_SLOW_OPERATION_MS: 5000,
  DATABASE_OPERATION_MS: 500,
  EXTERNAL_API_CALL_MS: 2000,
} as const;

/**
 * Helper to create business metrics spans for tracking invitation flows
 */
export function withInvitationMetrics<A, E, R>(
  operation: "create" | "accept" | "list" | "get",
  organizationSlug: string,
  additionalContext: Record<string, string | number | boolean>,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return withDOTracing(
    `invitation.${operation}`,
    createOrgDOAttributes(
      organizationSlug,
      `/invitations/${operation}`,
      "POST",
      `invitation.${operation}`,
      {
        "business.operation": "invitation_management",
        "business.flow": "user_onboarding",
        ...additionalContext,
      }
    ),
    effect
  );
}

/**
 * Helper to create business metrics spans for tracking organization operations
 */
export function withOrganizationMetrics<A, E, R>(
  operation: "create" | "get" | "update" | "delete",
  organizationSlug: string,
  additionalContext: Record<string, string | number | boolean>,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return withDOTracing(
    `organization.${operation}`,
    createOrgDOAttributes(
      organizationSlug,
      `/organization/${operation}`,
      "POST",
      `organization.${operation}`,
      {
        "business.operation": "organization_management",
        "business.flow": "tenant_lifecycle",
        ...additionalContext,
      }
    ),
    effect
  );
}

/**
 * Helper to create business metrics spans for tracking Shopify OAuth operations
 */
export function withShopifyOAuthMetrics<A, E, R>(
  operation:
    | "token.store"
    | "token.retrieve"
    | "token.exchange"
    | "nonce.generate",
  shopDomain: string,
  additionalContext: Record<string, string | number | boolean>,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return withDOTracing(
    `shopify.oauth.${operation}`,
    createShopifyOAuthDOAttributes(
      "shopify-oauth-shared",
      `/oauth/${operation.replace(".", "/")}`,
      "POST",
      `oauth.${operation}`,
      {
        "business.operation": "shopify_integration",
        "business.flow": "store_connection",
        "shop.domain": shopDomain,
        ...additionalContext,
      }
    ),
    effect
  );
}
