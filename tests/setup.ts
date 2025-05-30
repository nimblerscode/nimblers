import { vi } from "vitest";

// Mock the tenant migrations file to avoid ?raw import issues
vi.mock("../drizzle/tenant/migrations.js", () => ({
  default: {
    journal: { entries: [] },
    migrations: {},
  },
}));

// Mock the shopify migrations file to avoid ?raw import issues
vi.mock("../drizzle/shopify/migrations.js", () => ({
  default: {
    journal: { entries: [] },
    migrations: {},
  },
}));
