import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  manifestId: text("manifest_id").notNull(),
  version: text("version").notNull(),
  branch: text("branch").notNull(),
  buildDate: timestamp("build_date", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});
