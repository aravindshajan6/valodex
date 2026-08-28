import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

export const seasons = pgTable(
  "seasons",
  {
    uuid: uuidPk(),
    displayName: localized("display_name").notNull(),
    title: localized("title"),
    /** episode | act | null */
    type: text("type"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    parentUuid: text("parent_uuid"),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [index("seasons_parent_idx").on(t.parentUuid), index("seasons_start_idx").on(t.startTime)],
);

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  parent: one(seasons, { fields: [seasons.parentUuid], references: [seasons.uuid], relationName: "season_parent" }),
  children: many(seasons, { relationName: "season_parent" }),
}));

export const events = pgTable("events", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  shortDisplayName: localized("short_display_name"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  raw: raw(),
  syncedAt: syncedAt(),
});
