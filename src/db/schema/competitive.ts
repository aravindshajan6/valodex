import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

/** One row per episode's tier table; the newest set is the live ranked ladder. */
export const competitiveTierSets = pgTable("competitive_tier_sets", {
  uuid: uuidPk(),
  assetObjectName: text("asset_object_name").notNull(),
  order: integer("order").notNull(),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const competitiveTiers = pgTable(
  "competitive_tiers",
  {
    id: serial("id").primaryKey(),
    setUuid: text("set_uuid").notNull().references(() => competitiveTierSets.uuid, { onDelete: "cascade" }),
    tier: integer("tier").notNull(),
    tierName: localized("tier_name").notNull(),
    /** unranked | iron | bronze | silver | gold | platinum | diamond | ascendant | immortal | radiant | invalid */
    division: text("division").notNull(),
    divisionName: localized("division_name").notNull(),
    /** RGBA hex, e.g. 6ae2afff */
    color: text("color"),
    backgroundColor: text("background_color"),
    smallIcon: text("small_icon"),
    largeIcon: text("large_icon"),
    rankTriangleDownIcon: text("rank_triangle_down_icon"),
    rankTriangleUpIcon: text("rank_triangle_up_icon"),
  },
  (t) => [index("competitive_tiers_set_idx").on(t.setUuid)],
);

export const competitiveTierSetsRelations = relations(competitiveTierSets, ({ many }) => ({ tiers: many(competitiveTiers) }));
export const competitiveTiersRelations = relations(competitiveTiers, ({ one }) => ({
  set: one(competitiveTierSets, { fields: [competitiveTiers.setUuid], references: [competitiveTierSets.uuid] }),
}));
