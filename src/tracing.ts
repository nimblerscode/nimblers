import * as OtlpTracer from "@effect/opentelemetry/OtlpTracer";
import { FetchHttpClient } from "@effect/platform";
import { Layer } from "effect";
import { env } from "cloudflare:workers";

/**
 * Effect layer that provides a Worker-compatible OTLP tracer for Honeycomb.
 *
 * Required environment variables:
 * - HONEYCOMB_API_KEY: Your Honeycomb API key
 * - HONEYCOMB_DATASET: Your Honeycomb dataset name (optional, defaults to "nimblers")
 * - OTEL_SERVICE_NAME: Service name (optional, defaults to "nimblers-worker")
 * - OTEL_SERVICE_VERSION: Service version (optional, defaults to "1.0.0")
 */
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
