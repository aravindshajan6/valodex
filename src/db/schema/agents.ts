import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localized, raw, syncedAt, uuidPk } from "./_shared";

export const agentRoles = pgTable("agent_roles", {
  uuid: uuidPk(),
  displayName: localized("display_name").notNull(),
  description: localized("description"),
  displayIcon: text("display_icon"),
  raw: raw(),
  syncedAt: syncedAt(),
});

export const agents = pgTable(
  "agents",
  {
    uuid: uuidPk(),
    slug: text("slug").notNull().unique(),
    displayName: localized("display_name").notNull(),
    description: localized("description"),
    developerName: text("developer_name"),
    releaseDate: timestamp("release_date", { withTimezone: true }),
    characterTags: jsonb("character_tags").$type<Localized[]>(),
    displayIcon: text("display_icon"),
    displayIconSmall: text("display_icon_small"),
    bustPortrait: text("bust_portrait"),
    fullPortrait: text("full_portrait"),
    fullPortraitV2: text("full_portrait_v2"),
    killfeedPortrait: text("killfeed_portrait"),
    minimapPortrait: text("minimap_portrait"),
    background: text("background"),
    /** RGBA hex strings, e.g. ["371c5cff", "0f1923ff", ...] */
    backgroundGradientColors: jsonb("background_gradient_colors").$type<string[]>(),
    isFullPortraitRightFacing: boolean("is_full_portrait_right_facing").default(false).notNull(),
    isPlayableCharacter: boolean("is_playable_character").default(true).notNull(),
    isAvailableForTest: boolean("is_available_for_test").default(false).notNull(),
    isBaseContent: boolean("is_base_content").default(false).notNull(),
    roleUuid: text("role_uuid").references(() => agentRoles.uuid),
    recruitmentData: jsonb("recruitment_data").$type<Record<string, unknown>>(),
    voiceLine: jsonb("voice_line").$type<Record<string, unknown>>(),
    raw: raw(),
    syncedAt: syncedAt(),
  },
  (t) => [index("agents_role_idx").on(t.roleUuid)],
);

export const agentAbilities = pgTable(
  "agent_abilities",
  {
    id: serial("id").primaryKey(),
    agentUuid: text("agent_uuid").notNull().references(() => agents.uuid, { onDelete: "cascade" }),
    /** Ability1 | Ability2 | Grenade | Ultimate | Passive */
    slot: text("slot").notNull(),
    order: integer("order").notNull(),
    displayName: localized("display_name").notNull(),
    description: localized("description"),
    displayIcon: text("display_icon"),
  },
  (t) => [index("agent_abilities_agent_idx").on(t.agentUuid)],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  role: one(agentRoles, { fields: [agents.roleUuid], references: [agentRoles.uuid] }),
  abilities: many(agentAbilities),
}));
export const agentAbilitiesRelations = relations(agentAbilities, ({ one }) => ({
  agent: one(agents, { fields: [agentAbilities.agentUuid], references: [agents.uuid] }),
}));
export const agentRolesRelations = relations(agentRoles, ({ many }) => ({ agents: many(agents) }));

import type { Localized } from "@/lib/i18n";
