import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { buddies, bundles, contentTiers, playerCards, sprays, themes, weaponSkins, weapons } from "@/db/schema";
import { t } from "@/lib/i18n";

export const MEDIA = "https://media.valorant-api.com";
/** Every skin/tier icon on media.valorant-api.com follows this exact pattern (verified against all rows). */
export const skinIconUrl = (uuid: string) => `${MEDIA}/weaponskins/${uuid}/displayicon.png`;

// ---------------------------------------------------------------------------
// Skins
// ---------------------------------------------------------------------------

/**
 * Compact rows for the client-side /skins browser: only "tiered" skins (the
 * Standard defaults and "Random Favorite Skin" pseudo-skins have no content tier
 * and are hidden here, but stay reachable from /weapons/[slug]).
 */
export async function listBrowsableSkins() {
  return db
    .select({
      uuid: weaponSkins.uuid,
      slug: weaponSkins.slug,
      displayName: weaponSkins.displayName,
      hasIcon: sql<boolean>`${weaponSkins.displayIcon} is not null`,
      weaponSlug: weapons.slug,
      tier: contentTiers.devName,
      tierRank: contentTiers.rank,
      hasVideo: sql<boolean>`exists (select 1 from weapon_skin_levels l where l.skin_uuid = ${weaponSkins.uuid} and l.streamed_video is not null)`,
    })
    .from(weaponSkins)
    .innerJoin(weapons, eq(weapons.uuid, weaponSkins.weaponUuid))
    .innerJoin(contentTiers, eq(contentTiers.uuid, weaponSkins.contentTierUuid))
    .orderBy(desc(contentTiers.rank), asc(weaponSkins.slug));
}

export async function listContentTiers() {
  return db.select().from(contentTiers).orderBy(asc(contentTiers.rank));
}

/** Weapons with the number of tiered skins each has (for the browser's weapon filter). */
export async function listWeaponsWithSkinCounts() {
  return db
    .select({
      uuid: weapons.uuid,
      slug: weapons.slug,
      displayName: weapons.displayName,
      displayIcon: weapons.displayIcon,
      category: weapons.category,
      skinCount: count(weaponSkins.uuid),
    })
    .from(weapons)
    .leftJoin(weaponSkins, and(eq(weaponSkins.weaponUuid, weapons.uuid), isNotNull(weaponSkins.contentTierUuid)))
    .groupBy(weapons.uuid)
    .orderBy(asc(weapons.category), asc(weapons.slug));
}

/** Skin slugs are only unique per weapon, so the route is /skins/[weapon]/[slug]. */
export async function getSkinByWeaponAndSlug(weaponSlug: string, slug: string) {
  const weapon = await db.query.weapons.findFirst({
    where: eq(weapons.slug, weaponSlug),
    columns: { uuid: true, slug: true, displayName: true, displayIcon: true, category: true },
  });
  if (!weapon) return null;
  const skin = await db.query.weaponSkins.findFirst({
    where: and(eq(weaponSkins.weaponUuid, weapon.uuid), eq(weaponSkins.slug, slug)),
    with: {
      theme: true,
      contentTier: true,
      chromas: { orderBy: (c, { asc }) => [asc(c.order)] },
      levels: { orderBy: (l, { asc }) => [asc(l.order)] },
    },
  });
  if (!skin) return null;
  return { ...skin, weapon };
}

/** Other tiered skins sharing a theme (the "rest of the collection" row on a skin page). */
export async function listSkinsByThemes(themeUuids: string[]) {
  if (!themeUuids.length) return [];
  return db
    .select({
      uuid: weaponSkins.uuid,
      slug: weaponSkins.slug,
      displayName: weaponSkins.displayName,
      displayIcon: weaponSkins.displayIcon,
      weaponSlug: weapons.slug,
      weaponName: weapons.displayName,
      weaponCategory: weapons.category,
      tier: contentTiers.devName,
      tierRank: contentTiers.rank,
      tierColor: contentTiers.highlightColor,
      tierIcon: contentTiers.displayIcon,
    })
    .from(weaponSkins)
    .innerJoin(weapons, eq(weapons.uuid, weaponSkins.weaponUuid))
    .innerJoin(contentTiers, eq(contentTiers.uuid, weaponSkins.contentTierUuid))
    .where(inArray(weaponSkins.themeUuid, themeUuids))
    .orderBy(desc(contentTiers.rank), asc(weapons.category), asc(weapons.slug));
}

// ---------------------------------------------------------------------------
// Bundles ⇄ themes
//
// The API gives bundles no item list. 288/322 bundles share an en-US name with
// a theme, but names collide (three different "Reaver" themes, "Magepunk" ×3…).
// The Unreal asset paths carry a stable key on both sides:
//   bundle  …/StorefrontItem_<Key>[_]ThemeBundle_DataAsset
//   theme   …/Themes/Theme_<Key>_PrimaryAsset
// so we match on that key first (225 exact hits) and fall back to the name join
// (all same-named themes, union) for the rest. Total resolvable: 289.
// ---------------------------------------------------------------------------

export function bundleKey(assetPath: string | null | undefined): string | null {
  const m = /StorefrontItem_(.+?)_?ThemeBundle/i.exec(assetPath ?? "");
  return m ? m[1].toLowerCase() : null;
}
export function themeKey(assetPath: string | null | undefined): string | null {
  const m = /Theme_(.+)_PrimaryAsset$/i.exec(assetPath ?? "");
  return m ? m[1].toLowerCase() : null;
}
const norm = (s: string) => s.trim().toLowerCase();

type ThemeLite = { uuid: string; name: string; key: string | null; displayIcon: string | null; storeFeaturedImage: string | null };
type BundleLite = { uuid: string; slug: string; name: string; key: string | null };

async function listThemesLite(): Promise<ThemeLite[]> {
  const rows = await db
    .select({ uuid: themes.uuid, displayName: themes.displayName, displayIcon: themes.displayIcon, storeFeaturedImage: themes.storeFeaturedImage, assetPath: sql<string | null>`${themes.raw}->>'assetPath'` })
    .from(themes);
  return rows.map((r) => ({ uuid: r.uuid, name: t(r.displayName), key: themeKey(r.assetPath), displayIcon: r.displayIcon, storeFeaturedImage: r.storeFeaturedImage }));
}

async function listBundlesLite(): Promise<BundleLite[]> {
  const rows = await db.select({ uuid: bundles.uuid, slug: bundles.slug, displayName: bundles.displayName, assetPath: sql<string | null>`${bundles.raw}->>'assetPath'` }).from(bundles);
  return rows.map((r) => ({ uuid: r.uuid, slug: r.slug, name: t(r.displayName), key: bundleKey(r.assetPath) }));
}

/** Themes that make up a bundle: exact asset-key match if any, else every theme with the same name. */
export function resolveBundleThemes<T extends { name: string; key: string | null }>(bundle: { name: string; key: string | null }, all: T[]): T[] {
  if (bundle.key) {
    const keyed = all.filter((th) => th.key === bundle.key);
    if (keyed.length) return keyed;
  }
  const n = norm(bundle.name);
  return n ? all.filter((th) => norm(th.name) === n) : [];
}

/** Inverse lookup for a skin page's "part of bundle" link. Returns null if nothing matches. */
export async function findBundleForTheme(theme: { uuid: string; displayName: Parameters<typeof t>[0]; raw: Record<string, unknown> }) {
  const all = await listBundlesLite();
  const key = themeKey(theme.raw?.assetPath as string | undefined);
  const keyed = key ? all.filter((b) => b.key === key) : [];
  const pool = keyed.length ? keyed : all.filter((b) => norm(b.name) === norm(t(theme.displayName)));
  if (!pool.length) return null;
  const best = pool.sort((a, b) => a.slug.length - b.slug.length || a.slug.localeCompare(b.slug))[0];
  return { slug: best.slug, name: best.name };
}

// ---------------------------------------------------------------------------
// Bundles
// ---------------------------------------------------------------------------

export type BundleCounts = { skins: number; cards: number; sprays: number; buddies: number };

async function countsByTheme(): Promise<Map<string, BundleCounts>> {
  const [sk, pc, sp, bd] = await Promise.all([
    db.select({ theme: weaponSkins.themeUuid, n: count() }).from(weaponSkins).where(isNotNull(weaponSkins.contentTierUuid)).groupBy(weaponSkins.themeUuid),
    db.select({ theme: playerCards.themeUuid, n: count() }).from(playerCards).groupBy(playerCards.themeUuid),
    db.select({ theme: sprays.themeUuid, n: count() }).from(sprays).groupBy(sprays.themeUuid),
    db.select({ theme: buddies.themeUuid, n: count() }).from(buddies).groupBy(buddies.themeUuid),
  ]);
  const map = new Map<string, BundleCounts>();
  const get = (k: string) => map.get(k) ?? (map.set(k, { skins: 0, cards: 0, sprays: 0, buddies: 0 }).get(k) as BundleCounts);
  sk.forEach((r) => r.theme && (get(r.theme).skins += r.n));
  pc.forEach((r) => r.theme && (get(r.theme).cards += r.n));
  sp.forEach((r) => r.theme && (get(r.theme).sprays += r.n));
  bd.forEach((r) => r.theme && (get(r.theme).buddies += r.n));
  return map;
}

/** All bundles with derived item counts, sorted by name. */
export async function listBundles() {
  const [rows, allThemes, counts] = await Promise.all([
    db
      .select({
        uuid: bundles.uuid,
        slug: bundles.slug,
        displayName: bundles.displayName,
        displayNameSubText: bundles.displayNameSubText,
        displayIcon: bundles.displayIcon,
        logoIcon: bundles.logoIcon,
        verticalPromoImage: bundles.verticalPromoImage,
        assetPath: sql<string | null>`${bundles.raw}->>'assetPath'`,
      })
      .from(bundles)
      .orderBy(asc(bundles.slug)),
    listThemesLite(),
    countsByTheme(),
  ]);
  return rows.map((b) => {
    const matched = resolveBundleThemes({ name: t(b.displayName), key: bundleKey(b.assetPath) }, allThemes);
    const c: BundleCounts = { skins: 0, cards: 0, sprays: 0, buddies: 0 };
    for (const th of matched) {
      const x = counts.get(th.uuid);
      if (!x) continue;
      c.skins += x.skins; c.cards += x.cards; c.sprays += x.sprays; c.buddies += x.buddies;
    }
    return {
      uuid: b.uuid,
      slug: b.slug,
      displayName: b.displayName,
      displayNameSubText: b.displayNameSubText,
      displayIcon: b.displayIcon,
      logoIcon: b.logoIcon,
      verticalPromoImage: b.verticalPromoImage,
      themeCount: matched.length,
      counts: c,
      total: c.skins + c.cards + c.sprays + c.buddies,
    };
  });
}

export async function listBundleSlugs() {
  return db.select({ slug: bundles.slug }).from(bundles);
}

/** A bundle plus everything we can attribute to it through its theme(s). */
export async function getBundleBySlug(slug: string) {
  const bundle = await db.query.bundles.findFirst({ where: eq(bundles.slug, slug) });
  if (!bundle) return null;
  const allThemes = await listThemesLite();
  const matched = resolveBundleThemes({ name: t(bundle.displayName), key: bundleKey(bundle.raw?.assetPath as string | undefined) }, allThemes);
  const ids = matched.map((th) => th.uuid);

  const [skins, cards, sprayRows, buddyRows] = ids.length
    ? await Promise.all([
        listSkinsByThemes(ids),
        db.query.playerCards.findMany({ where: inArray(playerCards.themeUuid, ids), columns: { uuid: true, displayName: true, wideArt: true, largeArt: true, displayIcon: true } }),
        db.query.sprays.findMany({ where: inArray(sprays.themeUuid, ids), columns: { uuid: true, displayName: true, fullTransparentIcon: true, animationGif: true, displayIcon: true } }),
        db.query.buddies.findMany({ where: inArray(buddies.themeUuid, ids), columns: { uuid: true, displayName: true, displayIcon: true } }),
      ])
    : [[], [], [], []];

  const { raw: _raw, ...rest } = bundle;
  void _raw;
  return { ...rest, themes: matched, skins, cards, sprays: sprayRows, buddies: buddyRows };
}
