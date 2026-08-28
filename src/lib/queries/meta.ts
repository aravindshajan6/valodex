import { asc, desc, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { competitiveTierSets, competitiveTiers, events, gamemodes, seasons } from "@/db/schema";

/** All tier sets (one per episode's ladder), oldest → newest, with tiers in ladder order. */
export async function listTierSets() {
  return db.query.competitiveTierSets.findMany({
    with: { tiers: { where: ne(competitiveTiers.division, "invalid"), orderBy: [asc(competitiveTiers.tier)] } },
    orderBy: [asc(competitiveTierSets.order)],
  });
}

/** The live ranked ladder: the tier set with the highest `order`. */
export async function getCurrentTierSet() {
  return db.query.competitiveTierSets.findFirst({
    with: { tiers: { where: ne(competitiveTiers.division, "invalid"), orderBy: [asc(competitiveTiers.tier)] } },
    orderBy: [desc(competitiveTierSets.order)],
  });
}

/** Every season row (episodes and acts), chronological. Callers group acts under `parentUuid`. */
export async function listSeasons() {
  return db.query.seasons.findMany({ orderBy: [asc(seasons.startTime), asc(seasons.endTime)] });
}

export async function listEvents() {
  return db.query.events.findMany({ orderBy: [asc(events.startTime)] });
}

export async function getSyncState() {
  return db.query.syncState.findFirst();
}

export async function listGamemodes() {
  return db.query.gamemodes.findMany({ orderBy: [asc(gamemodes.slug)] });
}

export type TierSetWithTiers = Awaited<ReturnType<typeof listTierSets>>[number];
export type TierRow = TierSetWithTiers["tiers"][number];
export type SeasonRow = Awaited<ReturnType<typeof listSeasons>>[number];
export type EventRow = Awaited<ReturnType<typeof listEvents>>[number];
export type GamemodeRow = Awaited<ReturnType<typeof listGamemodes>>[number];
