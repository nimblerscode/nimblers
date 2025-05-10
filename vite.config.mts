import { redwood } from "@redwoodjs/sdk/vite";
/// <reference types="vitest" />
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isTest = process.env.VITEST === "true";

export default defineConfig({
  plugins: [tsconfigPaths(), !isTest && redwood()].filter(Boolean),
  assetsInclude: ["**/*.sql"],
  test: {
    globals: true,
    environment: "node",
    environmentOptions: {
      // We might need to add bindings or scriptPath later if tests need them
      // bindings: {},
      // scriptPath: 'src/edge/worker.ts',
    },
  },
});
