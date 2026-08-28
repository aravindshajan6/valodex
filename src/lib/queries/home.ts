import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, bundles, contentTiers, mapCallouts, maps, seasons, weaponSkinLevels, weaponSkins, weapons } from "@/db/schema";

/** Landing-page read models. Everything here is read-only and shaped for the home sections. */

export const MARQUEE_WEAPON_SLUGS = ["vandal", "phantom", "operator", "sheriff", "judge", "odin"] as const;
export const HOME_MAP_SLUGS = ["ascent", "bind", "haven", "split", "lotus", "sunset"] as const;

/** Current act (seasons.type = 'act' spanning now) plus the synced game version. */
export async function getHomeMeta() {
  const now = new Date();
  const [act, state] = await Promise.all([
    db.query.seasons.findFirst({
      where: and(eq(seasons.type, "act"), lte(seasons.startTime, now), gte(seasons.endTime, now)),
      orderBy: [desc(seasons.startTime)],
      with: { parent: true },
    }),
    db.query.syncState.findFirst(),
  ]);
  return { act: act ?? null, episode: act?.parent ?? null, version: state?.version ?? null, branch: state?.branch ?? null, buildDate: state?.buildDate ?? null };
}

/** Live counts for the stats strip. */
export async function getHomeStats() {
  const [[a], [w], [m], [s], [b], [v]] = await Promise.all([
    db.select({ n: count() }).from(agents).where(eq(agents.isPlayableCharacter, true)),
    db.select({ n: count() }).from(weapons),
    db.select({ n: countDistinct(mapCallouts.mapUuid) }).from(mapCallouts),
    db.select({ n: count() }).from(weaponSkins),
    db.select({ n: count() }).from(bundles),
    db.select({ n: count() }).from(weaponSkinLevels).where(isNotNull(weaponSkinLevels.streamedVideo)),
  ]);
  return { agents: a.n, weapons: w.n, maps: m.n, skins: s.n, bundles: b.n, skinVideos: v.n };
}

/** Playable agents with their role, for the horizontal rail. */
export async function listHomeAgents() {
  return db.query.agents.findMany({
    where: and(eq(agents.isPlayableCharacter, true), isNotNull(agents.fullPortrait)),
    with: { role: true },
    orderBy: [asc(agents.slug)],
  });
}

/** The six marquee weapons, in the order of MARQUEE_WEAPON_SLUGS. */
export async function listMarqueeWeapons() {
  const rows = await db.query.weapons.findMany({ where: inArray(weapons.slug, [...MARQUEE_WEAPON_SLUGS]) });
  const order = new Map<string, number>(MARQUEE_WEAPON_SLUGS.map((s, i) => [s, i]));
  return rows.sort((x, y) => (order.get(x.slug) ?? 99) - (order.get(y.slug) ?? 99));
}

/** A handful of maps that have callouts, with their callout counts. */
export async function listHomeMaps() {
  const rows = await db.query.maps.findMany({
    where: inArray(maps.slug, [...HOME_MAP_SLUGS]),
    with: { callouts: { columns: { id: true } } },
  });
  const order = new Map<string, number>(HOME_MAP_SLUGS.map((s, i) => [s, i]));
  return rows
    .filter((m) => m.callouts.length > 0 && m.splash)
    .sort((x, y) => (order.get(x.slug) ?? 99) - (order.get(y.slug) ?? 99));
}

/**
 * High-tier (Exclusive / Ultra) skins for the marquee weapons that have both a
 * display icon and at least one level with a streamed video. One per theme, Ultra first.
 */
export async function listShowcaseSkins(limit = 8) {
  const tiers = await db
    .select({ uuid: contentTiers.uuid })
    .from(contentTiers)
    .where(inArray(contentTiers.devName, ["Exclusive", "Ultra"]));
  const marquee = await db.select({ uuid: weapons.uuid }).from(weapons).where(inArray(weapons.slug, [...MARQUEE_WEAPON_SLUGS]));
  if (!tiers.length || !marquee.length) return [];

  const rows = await db.query.weaponSkins.findMany({
    where: and(
      inArray(weaponSkins.contentTierUuid, tiers.map((t) => t.uuid)),
      inArray(weaponSkins.weaponUuid, marquee.map((w) => w.uuid)),
      isNotNull(weaponSkins.displayIcon),
    ),
    with: {
      contentTier: true,
      theme: { columns: { uuid: true, displayName: true } },
      weapon: { columns: { slug: true, displayName: true } },
      levels: { orderBy: (l, { asc }) => [asc(l.order)], columns: { order: true, streamedVideo: true, levelItem: true } },
    },
  });

  const seenThemes = new Set<string>();
  const picked: typeof rows = [];
  const sorted = rows
    .filter((s) => s.levels.some((l) => l.streamedVideo))
    .sort((x, y) => (y.contentTier?.rank ?? 0) - (x.contentTier?.rank ?? 0) || x.slug.localeCompare(y.slug));
  for (const s of sorted) {
    const key = s.themeUuid ?? s.uuid;
    if (seenThemes.has(key)) continue;
    seenThemes.add(key);
    picked.push(s);
    if (picked.length >= limit) break;
  }
  return picked;
}
