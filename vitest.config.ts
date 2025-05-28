import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  // Add top-level resolve configuration for aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Specifies the pool implementation for running tests.
    pool: "@cloudflare/vitest-pool-workers",
    poolOptions: {
      workers: {
        // Specifies the configuration file for wrangler.
        wrangler: { configPath: "./wrangler.jsonc" },

        // Define any additional Miniflare specific options here,
        // such as cache persistence, log levels, etc.
        miniflare: {
          // kvPersist: true,
          // logLevel: "debug",
          bindings: {
            SHOPIFY_WEBHOOK_SECRET: "test-webhook-secret",
          },
        },

        // Define environment variables for the worker tests.
        // variables: {
        //   SHOPIFY_WEBHOOK_SECRET: "test-webhook-secret-key",
        // },

        // Define bindings needed for tests, overriding or supplementing wrangler.jsonc
        // kvNamespaces: [{ binding: "TEST_KV", id: "test-kv-namespace" }],
        // d1Databases: [{ binding: "TEST_DB", databaseName: "test-d1", databaseId: "test-d1-id" }],
        // durableObjects: [{ name: "TEST_DO", className: "TestDurableObject" }],
      },
    },
    // Add coverage configuration
    coverage: {
      provider: "v8", // or 'istanbul'
      reporter: ["text", "json", "html"], // Choose reporters
      // Add include/exclude patterns if needed
      // include: ['src/**/*.{ts,tsx}'],
      // exclude: ['src/types/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
