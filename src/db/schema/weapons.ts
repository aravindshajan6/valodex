import { boolean, index, integer, jsonb, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";
import { contentTiers, themes } from "./cosmetics";

export type AdsStats = {
  zoomMultiplier: number;
  fireRate: number;
  runSpeedMultiplier: number;
  burstCount: number;
  firstBulletAccuracy: number;
};
export type AltShotgunStats = { shotgunPelletCount: number; burstRate: number };
export type AirBurstStats = { shotgunPelletCount: number; burstDistance: number };

export const weapons = pgTable("weapons", {
  uuid: uuidPk(),
  slug: text("slug").notNull().unique(),
  displayName: localized("display_name").notNull(),
  /** heavy | melee | rifle | smg | shotgun | sidearm | sniper */
  category: text("category").notNull(),
  defaultSkinUuid: text("default_skin_uuid"),
  displayIcon: text("display_icon"),
  killStreamIcon: text("kill_stream_icon"),
  // ---- weaponStats (null for Melee) ----
  fireRate: real("fire_rate"),
  magazineSize: integer("magazine_size"),
  runSpeedMultiplier: real("run_speed_multiplier"),
  equipTimeSeconds: real("equip_time_seconds"),
  reloadTimeSeconds: real("reload_time_seconds"),
  firstBulletAccuracy: real("first_bullet_accuracy"),
  shotgunPelletCount: integer("shotgun_pellet_count"),
  /** low | medium | high */
  wallPenetration: text("wall_penetration"),
  /** dual-zoom | rof-increase | silenced */
  feature: text("feature"),
  /** semi-automatic */
  fireMode: text("fire_mode"),
  /** ads | ... */
  altFireType: text("alt_fire_type"),
  adsStats: jsonb("ads_stats").$type<AdsStats>(),
  altShotgunStats: jsonb("alt_shotgun_stats").$type<AltShotgunStats>(),
  airBurstStats: jsonb("air_burst_stats").$type<AirBurstStats>(),
  // ---- shopData ----
  cost: integer("cost"),
  shopCategory: text("shop_category"),
  shopCategoryText: localized("shop_category_text"),
  shopOrderPriority: integer("shop_order_priority"),
  shopGridRow: integer("shop_grid_row"),
  shopGridColumn: integer("shop_grid_column"),
  shopImage: text("shop_image"),
  canBeTrashed: boolean("can_be_trashed"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const weaponDamageRanges = pgTable(
  "weapon_damage_ranges",
  {
    id: serial("id").primaryKey(),
    weaponUuid: text("weapon_uuid").notNull().references(() => weapons.uuid, { onDelete: "cascade" }),
    rangeStartMeters: real("range_start_meters").notNull(),
    rangeEndMeters: real("range_end_meters").notNull(),
    headDamage: real("head_damage").notNull(),
    bodyDamage: real("body_damage").notNull(),
    legDamage: real("leg_damage").notNull(),
  },
  (t) => [index("weapon_damage_ranges_weapon_idx").on(t.weaponUuid)],
);

export const weaponSkins = pgTable(
  "weapon_skins",
  {
    uuid: uuidPk(),
    weaponUuid: text("weapon_uuid").notNull().references(() => weapons.uuid, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: localized("display_name").notNull(),
    themeUuid: text("theme_uuid").references(() => themes.uuid),
    contentTierUuid: text("content_tier_uuid").references(() => contentTiers.uuid),
    contentEditionUuid: text("content_edition_uuid"),
    displayIcon: text("display_icon"),
    wallpaper: text("wallpaper"),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [
    index("weapon_skins_weapon_idx").on(t.weaponUuid),
    index("weapon_skins_theme_idx").on(t.themeUuid),
    index("weapon_skins_tier_idx").on(t.contentTierUuid),
  ],
);

export const weaponSkinChromas = pgTable(
  "weapon_skin_chromas",
  {
    uuid: uuidPk(),
    skinUuid: text("skin_uuid").notNull().references(() => weaponSkins.uuid, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    displayName: localized("display_name").notNull(),
    displayIcon: text("display_icon"),
    fullRender: text("full_render"),
    swatch: text("swatch"),
    streamedVideo: text("streamed_video"),
  },
  (t) => [index("weapon_skin_chromas_skin_idx").on(t.skinUuid)],
);

export const weaponSkinLevels = pgTable(
  "weapon_skin_levels",
  {
    uuid: uuidPk(),
    skinUuid: text("skin_uuid").notNull().references(() => weaponSkins.uuid, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    displayName: localized("display_name").notNull(),
    /** vfx | animation | finisher | kill-banner | ... (normalized from EEquippableSkinLevelItem) */
    levelItem: text("level_item"),
    displayIcon: text("display_icon"),
    streamedVideo: text("streamed_video"),
  },
  (t) => [index("weapon_skin_levels_skin_idx").on(t.skinUuid)],
);

export const weaponsRelations = relations(weapons, ({ many }) => ({
  damageRanges: many(weaponDamageRanges),
  skins: many(weaponSkins),
}));
export const weaponDamageRangesRelations = relations(weaponDamageRanges, ({ one }) => ({
  weapon: one(weapons, { fields: [weaponDamageRanges.weaponUuid], references: [weapons.uuid] }),
}));
export const weaponSkinsRelations = relations(weaponSkins, ({ one, many }) => ({
  weapon: one(weapons, { fields: [weaponSkins.weaponUuid], references: [weapons.uuid] }),
  theme: one(themes, { fields: [weaponSkins.themeUuid], references: [themes.uuid] }),
  contentTier: one(contentTiers, { fields: [weaponSkins.contentTierUuid], references: [contentTiers.uuid] }),
  chromas: many(weaponSkinChromas),
  levels: many(weaponSkinLevels),
}));
export const weaponSkinChromasRelations = relations(weaponSkinChromas, ({ one }) => ({
  skin: one(weaponSkins, { fields: [weaponSkinChromas.skinUuid], references: [weaponSkins.uuid] }),
}));
export const weaponSkinLevelsRelations = relations(weaponSkinLevels, ({ one }) => ({
  skin: one(weaponSkins, { fields: [weaponSkinLevels.skinUuid], references: [weaponSkins.uuid] }),
}));
