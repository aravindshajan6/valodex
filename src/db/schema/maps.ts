import { index, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

export const maps = pgTable("maps", {
  uuid: uuidPk(),
  slug: text("slug").notNull().unique(),
  displayName: localized("display_name").notNull(),
  narrativeDescription: localized("narrative_description"),
  /** "A/B Sites", "A/B/C Sites", ... */
  tacticalDescription: localized("tactical_description"),
  coordinates: localized("coordinates"),
  displayIcon: text("display_icon"),
  listViewIcon: text("list_view_icon"),
  listViewIconTall: text("list_view_icon_tall"),
  splash: text("splash"),
  backgroundImage: text("background_image"),
  stylizedBackgroundImage: text("stylized_background_image"),
  premierBackgroundImage: text("premier_background_image"),
  /** Internal map asset path, e.g. /Game/Maps/Ascent/Ascent */
  mapUrl: text("map_url"),
  /**
   * World -> minimap UV transform. For a callout at world (x, y):
   *   u = y * xMultiplier + xScalarToAdd
   *   v = x * yMultiplier + yScalarToAdd
   * (note the axis swap — Valorant's minimap is rotated relative to world space)
   */
  xMultiplier: real("x_multiplier"),
  yMultiplier: real("y_multiplier"),
  xScalarToAdd: real("x_scalar_to_add"),
  yScalarToAdd: real("y_scalar_to_add"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const mapCallouts = pgTable(
  "map_callouts",
  {
    id: serial("id").primaryKey(),
    mapUuid: text("map_uuid").notNull().references(() => maps.uuid, { onDelete: "cascade" }),
    regionName: localized("region_name").notNull(),
    /** a | b | c | mid | attacker-side | defender-side */
    superRegion: text("super_region").notNull(),
    superRegionName: localized("super_region_name").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    z: real("z").notNull(),
  },
  (t) => [index("map_callouts_map_idx").on(t.mapUuid)],
);

export const mapsRelations = relations(maps, ({ many }) => ({ callouts: many(mapCallouts) }));
export const mapCalloutsRelations = relations(mapCallouts, ({ one }) => ({
  map: one(maps, { fields: [mapCallouts.mapUuid], references: [maps.uuid] }),
}));
