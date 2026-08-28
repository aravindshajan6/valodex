import { boolean, index, integer, jsonb, pgTable, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

export const themes = pgTable("themes", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  displayIcon: text("display_icon"),
  storeFeaturedImage: text("store_featured_image"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const contentTiers = pgTable("content_tiers", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  /** Select | Deluxe | Premium | Exclusive | Ultra */
  devName: text("dev_name").notNull(),
  rank: integer("rank").notNull(),
  juiceValue: integer("juice_value"),
  juiceCost: integer("juice_cost"),
  /** RGBA hex */
  highlightColor: text("highlight_color"),
  displayIcon: text("display_icon"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const bundles = pgTable("bundles", {
  uuid: uuidPk(),
  slug: text("slug").notNull().unique(),
  displayName: localized("display_name").notNull(),
  displayNameSubText: localized("display_name_sub_text"),
  description: localized("description"),
  extraDescription: localized("extra_description"),
  promoDescription: localized("promo_description"),
  useAdditionalContext: boolean("use_additional_context").default(false).notNull(),
  contentEditionUuid: text("content_edition_uuid"),
  displayIcon: text("display_icon"),
  displayIcon2: text("display_icon_2"),
  displayIcon3: text("display_icon_3"),
  logoIcon: text("logo_icon"),
  verticalPromoImage: text("vertical_promo_image"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const playerCards = pgTable(
  "player_cards",
  {
    uuid: uuidPk(),
    displayName: localized("display_name").notNull(),
    isHiddenIfNotOwned: boolean("is_hidden_if_not_owned").default(false).notNull(),
    themeUuid: text("theme_uuid").references(() => themes.uuid),
    displayIcon: text("display_icon"),
    smallArt: text("small_art"),
    wideArt: text("wide_art"),
    largeArt: text("large_art"),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [index("player_cards_theme_idx").on(t.themeUuid)],
);

export const playerTitles = pgTable("player_titles", {
  uuid: uuidPk(),
  displayName: localized("display_name"),
  titleText: localized("title_text"),
  isHiddenIfNotOwned: boolean("is_hidden_if_not_owned").default(false).notNull(),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const sprays = pgTable(
  "sprays",
  {
    uuid: uuidPk(),
    displayName: localized("display_name").notNull(),
    /** contextual | null */
    category: text("category"),
    themeUuid: text("theme_uuid").references(() => themes.uuid),
    isNullSpray: boolean("is_null_spray").default(false).notNull(),
    hideIfNotOwned: boolean("hide_if_not_owned").default(false).notNull(),
    displayIcon: text("display_icon"),
    fullIcon: text("full_icon"),
    fullTransparentIcon: text("full_transparent_icon"),
    animationPng: text("animation_png"),
    animationGif: text("animation_gif"),
    levels: jsonb("levels").$type<Array<Record<string, unknown>>>(),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [index("sprays_theme_idx").on(t.themeUuid)],
);

export const buddies = pgTable(
  "buddies",
  {
    uuid: uuidPk(),
    displayName: localized("display_name").notNull(),
    isHiddenIfNotOwned: boolean("is_hidden_if_not_owned").default(false).notNull(),
    themeUuid: text("theme_uuid").references(() => themes.uuid),
    displayIcon: text("display_icon"),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [index("buddies_theme_idx").on(t.themeUuid)],
);

export const buddyLevels = pgTable(
  "buddy_levels",
  {
    uuid: uuidPk(),
    buddyUuid: text("buddy_uuid").notNull().references(() => buddies.uuid, { onDelete: "cascade" }),
    charmLevel: integer("charm_level").notNull(),
    hideIfNotOwned: boolean("hide_if_not_owned").default(false).notNull(),
    displayName: localized("display_name").notNull(),
    displayIcon: text("display_icon"),
  },
  (t) => [index("buddy_levels_buddy_idx").on(t.buddyUuid)],
);

export const levelBorders = pgTable("level_borders", {
  uuid: uuidPk(),
  displayName: localized("display_name"),
  startingLevel: integer("starting_level").notNull(),
  levelNumber: integer("level_number").notNull(),
  levelNumberAppearance: text("level_number_appearance"),
  smallPlayerCardAppearance: text("small_player_card_appearance"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const flex = pgTable("flex", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  displayNameAllCaps: localized("display_name_all_caps"),
  displayIcon: text("display_icon"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const themesRelations = relations(themes, ({ many }) => ({
  playerCards: many(playerCards),
  sprays: many(sprays),
  buddies: many(buddies),
}));
export const playerCardsRelations = relations(playerCards, ({ one }) => ({
  theme: one(themes, { fields: [playerCards.themeUuid], references: [themes.uuid] }),
}));
export const spraysRelations = relations(sprays, ({ one }) => ({
  theme: one(themes, { fields: [sprays.themeUuid], references: [themes.uuid] }),
}));
export const buddiesRelations = relations(buddies, ({ one, many }) => ({
  theme: one(themes, { fields: [buddies.themeUuid], references: [themes.uuid] }),
  levels: many(buddyLevels),
}));
export const buddyLevelsRelations = relations(buddyLevels, ({ one }) => ({
  buddy: one(buddies, { fields: [buddyLevels.buddyUuid], references: [buddies.uuid] }),
}));
