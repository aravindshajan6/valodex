import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

export const gamemodes = pgTable("gamemodes", {
  uuid: uuidPk(),
  slug: text("slug").notNull().unique(),
  displayName: localized("display_name").notNull(),
  description: localized("description"),
  duration: localized("duration"),
  economyType: text("economy_type"),
  allowsMatchTimeouts: boolean("allows_match_timeouts").default(false).notNull(),
  allowsCustomGameReplays: boolean("allows_custom_game_replays").default(false).notNull(),
  isTeamVoiceAllowed: boolean("is_team_voice_allowed").default(true).notNull(),
  isMinimapHidden: boolean("is_minimap_hidden").default(false).notNull(),
  orbCount: integer("orb_count"),
  roundsPerHalf: integer("rounds_per_half"),
  teamRoles: jsonb("team_roles").$type<string[]>(),
  gameFeatureOverrides: jsonb("game_feature_overrides").$type<Array<{ featureName: string; state: boolean }>>(),
  gameRuleBoolOverrides: jsonb("game_rule_bool_overrides").$type<Array<{ ruleName: string; state: boolean }>>(),
  displayIcon: text("display_icon"),
  listViewIconTall: text("list_view_icon_tall"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const gear = pgTable("gear", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  description: localized("description"),
  descriptions: jsonb("descriptions").$type<Localized[]>(),
  details: jsonb("details").$type<Array<Record<string, unknown>>>(),
  displayIcon: text("display_icon"),
  cost: integer("cost"),
  shopCategory: text("shop_category"),
  shopCategoryText: localized("shop_category_text"),
  shopImage: text("shop_image"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const currencies = pgTable("currencies", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  displayNameSingular: localized("display_name_singular"),
  displayIcon: text("display_icon"),
  largeIcon: text("large_icon"),
  rewardPreviewIcon: text("reward_preview_icon"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export type ContractReward = { type: string; uuid: string; amount: number; isHighlighted: boolean };
export type ContractLevel = { reward: ContractReward; xp: number; vpCost: number; isPurchasableWithVP: boolean; doughCost: number; isPurchasableWithDough: boolean };
export type ContractChapter = { isEpilogue: boolean; levels: ContractLevel[]; freeRewards: ContractReward[] | null };

export const contracts = pgTable("contracts", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  displayIcon: text("display_icon"),
  shipIt: boolean("ship_it").default(false).notNull(),
  useLevelVpCostOverride: boolean("use_level_vp_cost_override").default(false).notNull(),
  levelVpCostOverride: integer("level_vp_cost_override"),
  freeRewardScheduleUuid: text("free_reward_schedule_uuid"),
  /** Season | Agent | Event */
  relationType: text("relation_type"),
  relationUuid: text("relation_uuid"),
  premiumRewardScheduleUuid: text("premium_reward_schedule_uuid"),
  premiumVpCost: integer("premium_vp_cost"),
  chapters: jsonb("chapters").$type<ContractChapter[]>().notNull(),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const missions = pgTable("missions", {
  uuid: uuidPk(),
  displayName: localized("display_name"),
  title: localized("title"),
  /** tutorial | daily | weekly | npe | bp-easy | ... */
  type: text("type"),
  xpGrant: integer("xp_grant"),
  progressToComplete: integer("progress_to_complete"),
  activationDate: timestamp("activation_date", { withTimezone: true }),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  tags: jsonb("tags").$type<string[]>(),
  objectives: jsonb("objectives").$type<Array<{ objectiveUuid: string; value: number }>>(),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const objectives = pgTable("objectives", {
  uuid: uuidPk(),
  directive: localized("directive"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const ceremonies = pgTable("ceremonies", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  raw: raw(),
  syncedAt: syncedAt(),
});

import type { Localized } from "@/lib/i18n";
