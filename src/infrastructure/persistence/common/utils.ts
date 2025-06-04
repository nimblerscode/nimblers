import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

// === Better Auth Aligned Schema ===
// This util ensures the column always stores an ISO string (never a Date object)
// All values passed to this column must be ISO strings. Application code is responsible for converting Date objects to ISO strings before insert/update.
export const normalizeDate = (column: string) => {
  return integer(column, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
  // .$onUpdate(() => new Date());
};

// Nullable version for optional timestamps
export const normalizeDateNullable = (column: string) => {
  return integer(column, { mode: "timestamp_ms" });
};
