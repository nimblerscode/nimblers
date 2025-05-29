import { createRequire } from "node:module";
import { redwood } from "rwsdk/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isTest = process.env.VITEST === "true";

export default defineConfig({
  plugins: [tsconfigPaths(), !isTest && redwood()].filter(Boolean),
  assetsInclude: ["**/*.sql"],
  ssr: {},
  server: {
    // Allow external hosts for tunnel access
    host: true,
    // Allow all hosts from Cloudflare tunnels
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "client-only": createRequire(import.meta.url).resolve("client-only"),
    },
  },
});
