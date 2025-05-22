import { createRequire } from "node:module";
import { redwood } from "rwsdk/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isTest = process.env.VITEST === "true";

export default defineConfig({
  plugins: [tsconfigPaths(), !isTest && redwood()].filter(Boolean),
  assetsInclude: ["**/*.sql"],
  ssr: {},
  resolve: {
    alias: {
      "client-only": createRequire(import.meta.url).resolve("client-only"),
    },
  },
});
