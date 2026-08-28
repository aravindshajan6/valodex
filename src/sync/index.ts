/* eslint-disable @typescript-eslint/no-explicit-any -- upstream records are intentionally loose; the DB `raw` column keeps them whole */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import { normalizeEnum, uniqueSlugs } from "@/lib/slug";
import { api } from "./api";

type Row = Record<string, any>;

export type SyncStep = { label: string; rows: number; ms: number };

export type SyncOptions = {
  /** Re-run even when the upstream manifest is unchanged. */
  force?: boolean;
  /** Restrict to specific steps, e.g. `["weapons", "maps"]`. Skips the manifest bookkeeping. */
  only?: string[];
  /** Progress sink. Defaults to a no-op; the CLI passes `console.log`. */
  log?: (line: string) => void;
};

export type SyncResult = {
  status: "synced" | "skipped";
  /** Upstream build the data now reflects. */
  version: { manifestId: string; version: string; branch: string; buildDate: string };
  steps: SyncStep[];
  rows: number;
  ms: number;
};

const date = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  // The API uses 0001-01-01 / 1970-01-01 as "unset".
  return Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1980 ? null : d;
};
const en = (loc: Row | null | undefined) => (loc?.["en-US"] as string | undefined) ?? "";

async function syncAgents() {
  const data = await api.list("agents");
  const roles = new Map<string, Row>();
  for (const a of data) if (a.role) roles.set(a.role.uuid, a.role);
  const slugs = uniqueSlugs(data, (a) => en(a.displayName));
  return db.transaction(async (tx) => {
    await tx.delete(s.agents);
    await tx.delete(s.agentRoles);
    await tx.insert(s.agentRoles).values(
      [...roles.values()].map((r) => ({ uuid: r.uuid, displayName: r.displayName, description: r.description, displayIcon: r.displayIcon, raw: r })),
    );
    await tx.insert(s.agents).values(
      data.map((a, i) => ({
        uuid: a.uuid, slug: slugs[i], displayName: a.displayName, description: a.description, developerName: a.developerName,
        releaseDate: date(a.releaseDate), characterTags: a.characterTags, displayIcon: a.displayIcon, displayIconSmall: a.displayIconSmall,
        bustPortrait: a.bustPortrait, fullPortrait: a.fullPortrait, fullPortraitV2: a.fullPortraitV2, killfeedPortrait: a.killfeedPortrait,
        minimapPortrait: a.minimapPortrait, background: a.background, backgroundGradientColors: a.backgroundGradientColors,
        isFullPortraitRightFacing: !!a.isFullPortraitRightFacing, isPlayableCharacter: !!a.isPlayableCharacter,
        isAvailableForTest: !!a.isAvailableForTest, isBaseContent: !!a.isBaseContent, roleUuid: a.role?.uuid ?? null,
        recruitmentData: a.recruitmentData, voiceLine: a.voiceLine, raw: a,
      })),
    );
    const abilities = data.flatMap((a) =>
      (a.abilities ?? []).map((ab: Row, order: number) => ({
        agentUuid: a.uuid, slot: ab.slot, order, displayName: ab.displayName, description: ab.description, displayIcon: ab.displayIcon,
      })),
    );
    await tx.insert(s.agentAbilities).values(abilities);
    return data.length;
  });
}

async function syncCosmeticLookups() {
  const [themes, tiers] = await Promise.all([api.list("themes"), api.list("contenttiers")]);
  await db.transaction(async (tx) => {
    // Skins/cards/sprays/buddies reference these; wipe dependents first.
    await tx.delete(s.weaponSkins);
    await tx.delete(s.playerCards);
    await tx.delete(s.sprays);
    await tx.delete(s.buddies);
    await tx.delete(s.themes);
    await tx.delete(s.contentTiers);
    for (let i = 0; i < themes.length; i += 200)
      await tx.insert(s.themes).values(themes.slice(i, i + 200).map((t) => ({ uuid: t.uuid, displayName: t.displayName, displayIcon: t.displayIcon, storeFeaturedImage: t.storeFeaturedImage, raw: t })));
    await tx.insert(s.contentTiers).values(
      tiers.map((t) => ({ uuid: t.uuid, displayName: t.displayName, devName: t.devName, rank: t.rank, juiceValue: t.juiceValue, juiceCost: t.juiceCost, highlightColor: t.highlightColor, displayIcon: t.displayIcon, raw: t })),
    );
  });
  return themes.length + tiers.length;
}

async function syncWeapons() {
  const data = await api.list("weapons");
  const slugs = uniqueSlugs(data, (w) => en(w.displayName));
  const themeUuids = new Set((await db.select({ uuid: s.themes.uuid }).from(s.themes)).map((r) => r.uuid));
  const tierUuids = new Set((await db.select({ uuid: s.contentTiers.uuid }).from(s.contentTiers)).map((r) => r.uuid));
  return db.transaction(async (tx) => {
    await tx.delete(s.weapons);
    await tx.insert(s.weapons).values(
      data.map((w, i) => {
        const st = w.weaponStats ?? {};
        const sh = w.shopData ?? {};
        return {
          uuid: w.uuid, slug: slugs[i], displayName: w.displayName, category: normalizeEnum(w.category)!, defaultSkinUuid: w.defaultSkinUuid,
          displayIcon: w.displayIcon, killStreamIcon: w.killStreamIcon,
          fireRate: st.fireRate ?? null, magazineSize: st.magazineSize ?? null, runSpeedMultiplier: st.runSpeedMultiplier ?? null,
          equipTimeSeconds: st.equipTimeSeconds ?? null, reloadTimeSeconds: st.reloadTimeSeconds ?? null, firstBulletAccuracy: st.firstBulletAccuracy ?? null,
          shotgunPelletCount: st.shotgunPelletCount ?? null, wallPenetration: normalizeEnum(st.wallPenetration), feature: normalizeEnum(st.feature),
          fireMode: normalizeEnum(st.fireMode), altFireType: normalizeEnum(st.altFireType), adsStats: st.adsStats ?? null,
          altShotgunStats: st.altShotgunStats ?? null, airBurstStats: st.airBurstStats ?? null,
          cost: sh.cost ?? null, shopCategory: sh.category ?? null, shopCategoryText: sh.categoryText ?? null, shopOrderPriority: sh.shopOrderPriority ?? null,
          shopGridRow: sh.gridPosition?.row ?? null, shopGridColumn: sh.gridPosition?.column ?? null, shopImage: sh.newImage ?? sh.image ?? null,
          canBeTrashed: sh.canBeTrashed ?? null, raw: w,
        };
      }),
    );
    const ranges = data.flatMap((w) =>
      (w.weaponStats?.damageRanges ?? []).map((r: Row) => ({
        weaponUuid: w.uuid, rangeStartMeters: r.rangeStartMeters, rangeEndMeters: r.rangeEndMeters, headDamage: r.headDamage, bodyDamage: r.bodyDamage, legDamage: r.legDamage,
      })),
    );
    await tx.insert(s.weaponDamageRanges).values(ranges);

    const skins: (typeof s.weaponSkins.$inferInsert)[] = [];
    const chromas: (typeof s.weaponSkinChromas.$inferInsert)[] = [];
    const levels: (typeof s.weaponSkinLevels.$inferInsert)[] = [];
    for (const w of data) {
      const skinSlugs = uniqueSlugs(w.skins as Row[], (sk) => en(sk.displayName));
      (w.skins as Row[]).forEach((sk, i) => {
        skins.push({
          uuid: sk.uuid, weaponUuid: w.uuid, slug: skinSlugs[i], displayName: sk.displayName,
          themeUuid: themeUuids.has(sk.themeUuid) ? sk.themeUuid : null,
          contentTierUuid: tierUuids.has(sk.contentTierUuid) ? sk.contentTierUuid : null,
          contentEditionUuid: sk.contentEditionUuid, displayIcon: sk.displayIcon, wallpaper: sk.wallpaper, raw: sk,
        });
        (sk.chromas ?? []).forEach((c: Row, order: number) =>
          chromas.push({ uuid: c.uuid, skinUuid: sk.uuid, order, displayName: c.displayName, displayIcon: c.displayIcon, fullRender: c.fullRender, swatch: c.swatch, streamedVideo: c.streamedVideo }),
        );
        (sk.levels ?? []).forEach((l: Row, order: number) =>
          levels.push({ uuid: l.uuid, skinUuid: sk.uuid, order, displayName: l.displayName, levelItem: normalizeEnum(l.levelItem), displayIcon: l.displayIcon, streamedVideo: l.streamedVideo }),
        );
      });
    }
    for (let i = 0; i < skins.length; i += 200) await tx.insert(s.weaponSkins).values(skins.slice(i, i + 200));
    for (let i = 0; i < chromas.length; i += 500) await tx.insert(s.weaponSkinChromas).values(chromas.slice(i, i + 500));
    for (let i = 0; i < levels.length; i += 500) await tx.insert(s.weaponSkinLevels).values(levels.slice(i, i + 500));
    return data.length + skins.length + chromas.length + levels.length;
  });
}

async function syncMaps() {
  const data = await api.list("maps");
  const slugs = uniqueSlugs(data, (m) => en(m.displayName));
  return db.transaction(async (tx) => {
    await tx.delete(s.maps);
    await tx.insert(s.maps).values(
      data.map((m, i) => ({
        uuid: m.uuid, slug: slugs[i], displayName: m.displayName, narrativeDescription: m.narrativeDescription, tacticalDescription: m.tacticalDescription,
        coordinates: m.coordinates, displayIcon: m.displayIcon, listViewIcon: m.listViewIcon, listViewIconTall: m.listViewIconTall, splash: m.splash,
        backgroundImage: m.backgroundImage, stylizedBackgroundImage: m.stylizedBackgroundImage, premierBackgroundImage: m.premierBackgroundImage, mapUrl: m.mapUrl,
        xMultiplier: m.xMultiplier, yMultiplier: m.yMultiplier, xScalarToAdd: m.xScalarToAdd, yScalarToAdd: m.yScalarToAdd, raw: m,
      })),
    );
    const callouts = data.flatMap((m) =>
      (m.callouts ?? []).map((c: Row) => ({
        mapUuid: m.uuid, regionName: c.regionName, superRegion: normalizeEnum(c.superRegion)!, superRegionName: c.superRegionName,
        x: c.location.x, y: c.location.y, z: c.location.z,
      })),
    );
    if (callouts.length) await tx.insert(s.mapCallouts).values(callouts);
    return data.length + callouts.length;
  });
}

async function syncCompetitive() {
  const data = await api.list("competitivetiers");
  return db.transaction(async (tx) => {
    await tx.delete(s.competitiveTierSets);
    await tx.insert(s.competitiveTierSets).values(data.map((set, order) => ({ uuid: set.uuid, assetObjectName: set.assetObjectName, order, raw: set })));
    const tiers = data.flatMap((set) =>
      (set.tiers ?? []).map((t: Row) => ({
        setUuid: set.uuid, tier: t.tier, tierName: t.tierName, division: normalizeEnum(t.division)!, divisionName: t.divisionName, color: t.color,
        backgroundColor: t.backgroundColor, smallIcon: t.smallIcon, largeIcon: t.largeIcon, rankTriangleDownIcon: t.rankTriangleDownIcon, rankTriangleUpIcon: t.rankTriangleUpIcon,
      })),
    );
    await tx.insert(s.competitiveTiers).values(tiers);
    return data.length + tiers.length;
  });
}

async function syncSeasons() {
  const [seasons, events] = await Promise.all([api.list("seasons"), api.list("events")]);
  await db.transaction(async (tx) => {
    await tx.delete(s.seasons);
    await tx.delete(s.events);
    await tx.insert(s.seasons).values(
      seasons.map((x) => ({ uuid: x.uuid, displayName: x.displayName, title: x.title, type: normalizeEnum(x.type), startTime: new Date(x.startTime), endTime: new Date(x.endTime), parentUuid: x.parentUuid, raw: x })),
    );
    await tx.insert(s.events).values(
      events.map((x) => ({ uuid: x.uuid, displayName: x.displayName, shortDisplayName: x.shortDisplayName, startTime: new Date(x.startTime), endTime: new Date(x.endTime), raw: x })),
    );
  });
  return seasons.length + events.length;
}

async function syncCosmetics() {
  const [bundles, cards, titles, sprays, buddies, borders, flex] = await Promise.all([
    api.list("bundles"), api.list("playercards"), api.list("playertitles"), api.list("sprays"), api.list("buddies"), api.list("levelborders"), api.list("flex"),
  ]);
  const themeUuids = new Set((await db.select({ uuid: s.themes.uuid }).from(s.themes)).map((r) => r.uuid));
  const theme = (u: string | null) => (u && themeUuids.has(u) ? u : null);
  const bundleSlugs = uniqueSlugs(bundles, (b) => en(b.displayName));
  return db.transaction(async (tx) => {
    await tx.delete(s.bundles); await tx.delete(s.playerCards); await tx.delete(s.playerTitles);
    await tx.delete(s.sprays); await tx.delete(s.buddies); await tx.delete(s.levelBorders); await tx.delete(s.flex);
    const ins = async (table: any, rows: Row[]) => { for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200)); };
    await ins(s.bundles, bundles.map((b, i) => ({
      uuid: b.uuid, slug: bundleSlugs[i], displayName: b.displayName, displayNameSubText: b.displayNameSubText, description: b.description, extraDescription: b.extraDescription,
      promoDescription: b.promoDescription, useAdditionalContext: !!b.useAdditionalContext, contentEditionUuid: b.contentEditionUuid, displayIcon: b.displayIcon,
      displayIcon2: b.displayIcon2, displayIcon3: b.displayIcon3, logoIcon: b.logoIcon, verticalPromoImage: b.verticalPromoImage, raw: b,
    })));
    await ins(s.playerCards, cards.map((c) => ({ uuid: c.uuid, displayName: c.displayName, isHiddenIfNotOwned: !!c.isHiddenIfNotOwned, themeUuid: theme(c.themeUuid), displayIcon: c.displayIcon, smallArt: c.smallArt, wideArt: c.wideArt, largeArt: c.largeArt, raw: c })));
    await ins(s.playerTitles, titles.map((t) => ({ uuid: t.uuid, displayName: t.displayName, titleText: t.titleText, isHiddenIfNotOwned: !!t.isHiddenIfNotOwned, raw: t })));
    await ins(s.sprays, sprays.map((x) => ({
      uuid: x.uuid, displayName: x.displayName, category: normalizeEnum(x.category), themeUuid: theme(x.themeUuid), isNullSpray: !!x.isNullSpray, hideIfNotOwned: !!x.hideIfNotOwned,
      displayIcon: x.displayIcon, fullIcon: x.fullIcon, fullTransparentIcon: x.fullTransparentIcon, animationPng: x.animationPng, animationGif: x.animationGif, levels: x.levels, raw: x,
    })));
    await ins(s.buddies, buddies.map((b) => ({ uuid: b.uuid, displayName: b.displayName, isHiddenIfNotOwned: !!b.isHiddenIfNotOwned, themeUuid: theme(b.themeUuid), displayIcon: b.displayIcon, raw: b })));
    await ins(s.buddyLevels, buddies.flatMap((b) => (b.levels ?? []).map((l: Row) => ({ uuid: l.uuid, buddyUuid: b.uuid, charmLevel: l.charmLevel, hideIfNotOwned: !!l.hideIfNotOwned, displayName: l.displayName, displayIcon: l.displayIcon }))));
    await ins(s.levelBorders, borders.map((b) => ({ uuid: b.uuid, displayName: b.displayName, startingLevel: b.startingLevel, levelNumber: b.levelNumber, levelNumberAppearance: b.levelNumberAppearance, smallPlayerCardAppearance: b.smallPlayerCardAppearance, raw: b })));
    await ins(s.flex, flex.map((f) => ({ uuid: f.uuid, displayName: f.displayName, displayNameAllCaps: f.displayNameAllCaps, displayIcon: f.displayIcon, raw: f })));
    return bundles.length + cards.length + titles.length + sprays.length + buddies.length + borders.length + flex.length;
  });
}

async function syncMisc() {
  const [gamemodes, gear, currencies, contracts, missions, objectives, ceremonies] = await Promise.all([
    api.list("gamemodes"), api.list("gear"), api.list("currencies"), api.list("contracts"), api.list("missions"), api.list("objectives"), api.list("ceremonies"),
  ]);
  const gmSlugs = uniqueSlugs(gamemodes, (g) => en(g.displayName));
  return db.transaction(async (tx) => {
    await tx.delete(s.gamemodes); await tx.delete(s.gear); await tx.delete(s.currencies); await tx.delete(s.contracts);
    await tx.delete(s.missions); await tx.delete(s.objectives); await tx.delete(s.ceremonies);
    const ins = async (table: any, rows: Row[]) => { for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200)); };
    await ins(s.gamemodes, gamemodes.map((g, i) => ({
      uuid: g.uuid, slug: gmSlugs[i], displayName: g.displayName, description: g.description, duration: g.duration, economyType: normalizeEnum(g.economyType),
      allowsMatchTimeouts: !!g.allowsMatchTimeouts, allowsCustomGameReplays: !!g.allowsCustomGameReplays, isTeamVoiceAllowed: !!g.isTeamVoiceAllowed, isMinimapHidden: !!g.isMinimapHidden,
      orbCount: g.orbCount, roundsPerHalf: g.roundsPerHalf, teamRoles: g.teamRoles, gameFeatureOverrides: g.gameFeatureOverrides, gameRuleBoolOverrides: g.gameRuleBoolOverrides,
      displayIcon: g.displayIcon, listViewIconTall: g.listViewIconTall, raw: g,
    })));
    await ins(s.gear, gear.map((g) => ({
      uuid: g.uuid, displayName: g.displayName, description: g.description, descriptions: g.descriptions, details: g.details, displayIcon: g.displayIcon,
      cost: g.shopData?.cost ?? null, shopCategory: g.shopData?.category ?? null, shopCategoryText: g.shopData?.categoryText ?? null, shopImage: g.shopData?.newImage ?? g.shopData?.image ?? null, raw: g,
    })));
    await ins(s.currencies, currencies.map((c) => ({ uuid: c.uuid, displayName: c.displayName, displayNameSingular: c.displayNameSingular, displayIcon: c.displayIcon, largeIcon: c.largeIcon, rewardPreviewIcon: c.rewardPreviewIcon, raw: c })));
    await ins(s.contracts, contracts.map((c) => ({
      uuid: c.uuid, displayName: c.displayName, displayIcon: c.displayIcon, shipIt: !!c.shipIt, useLevelVpCostOverride: !!c.useLevelVPCostOverride, levelVpCostOverride: c.levelVPCostOverride,
      freeRewardScheduleUuid: c.freeRewardScheduleUuid, relationType: c.content?.relationType ?? null, relationUuid: c.content?.relationUuid ?? null,
      premiumRewardScheduleUuid: c.content?.premiumRewardScheduleUuid ?? null, premiumVpCost: c.content?.premiumVPCost ?? null, chapters: c.content?.chapters ?? [], raw: c,
    })));
    await ins(s.missions, missions.map((m) => ({
      uuid: m.uuid, displayName: m.displayName, title: m.title, type: normalizeEnum(m.type), xpGrant: m.xpGrant, progressToComplete: m.progressToComplete,
      activationDate: date(m.activationDate), expirationDate: date(m.expirationDate), tags: m.tags, objectives: m.objectives, raw: m,
    })));
    await ins(s.objectives, objectives.map((o) => ({ uuid: o.uuid, directive: o.directive, raw: o })));
    await ins(s.ceremonies, ceremonies.map((c) => ({ uuid: c.uuid, displayName: c.displayName, raw: c })));
    return gamemodes.length + gear.length + currencies.length + contracts.length + missions.length + objectives.length + ceremonies.length;
  });
}

/**
 * Pull the whole valorant-api.com catalogue into Postgres.
 *
 * Version-gated: if the upstream `manifestId` matches what we last stored, this
 * returns `{ status: "skipped" }` without touching the database. Each step is a
 * full replace inside its own transaction, so a failure leaves the previous
 * contents of the tables it did not reach intact.
 */
export async function runSync({ force = false, only, log = () => {} }: SyncOptions = {}): Promise<SyncResult> {
  const started = Date.now();
  const steps: SyncStep[] = [];

  const replace = async (label: string, fn: () => Promise<number>) => {
    if (only && !only.includes(label)) return;
    const t0 = Date.now();
    const rows = await fn();
    const ms = Date.now() - t0;
    steps.push({ label, rows, ms });
    log(`  ${label.padEnd(18)} ${String(rows).padStart(5)} rows  ${ms}ms`);
  };

  const version = await api.version();
  const [state] = await db.select().from(s.syncState).limit(1);
  log(`upstream ${version.branch} (${version.version}) manifest ${version.manifestId}`);

  if (state && state.manifestId === version.manifestId && !force && !only) {
    log(`already synced at ${state.syncedAt.toISOString()} — pass --force to re-run`);
    return { status: "skipped", version, steps, rows: 0, ms: Date.now() - started };
  }

  log("syncing...");
  await replace("agents", syncAgents);
  await replace("cosmetic-lookups", syncCosmeticLookups);
  await replace("weapons", syncWeapons);
  await replace("maps", syncMaps);
  await replace("competitive", syncCompetitive);
  await replace("seasons", syncSeasons);
  await replace("cosmetics", syncCosmetics);
  await replace("misc", syncMisc);

  // `--only` runs are partial, so they must not claim the manifest is fully synced.
  if (!only) {
    const row = { manifestId: version.manifestId, version: version.version, branch: version.branch, buildDate: date(version.buildDate) };
    await db
      .insert(s.syncState)
      .values({ id: 1, ...row })
      .onConflictDoUpdate({ target: s.syncState.id, set: { ...row, syncedAt: sql`now()` } });
  }

  const result: SyncResult = { status: "synced", version, steps, rows: steps.reduce((n, x) => n + x.rows, 0), ms: Date.now() - started };
  log(`done in ${result.ms}ms`);
  return result;
}
