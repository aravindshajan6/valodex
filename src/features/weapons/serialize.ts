import { t } from "@/lib/i18n";
import type { WeaponDetailRow, WeaponRow } from "@/lib/queries/weapons";
import type { SkinSummary, WeaponSummary } from "./types";

/** `"6ae2afff"` (RGBA hex from the API) -> `"#6ae2af"`. */
export function apiColor(value: string | null | undefined): string | null {
  if (!value) return null;
  return `#${value.slice(0, 6)}`;
}

/** Server-side: flatten a Drizzle weapon row into localised plain props. */
export function toWeaponSummary(row: WeaponRow, skinCount = 0): WeaponSummary {
  return {
    uuid: row.uuid,
    slug: row.slug,
    name: t(row.displayName),
    category: row.category,
    shopCategory: row.shopCategory ?? null,
    shopCategoryLabel: t(row.shopCategoryText) || (row.category === "melee" ? "Melee" : row.shopCategory ?? ""),
    cost: row.cost ?? null,
    fireRate: row.fireRate ?? null,
    magazineSize: row.magazineSize ?? null,
    runSpeedMultiplier: row.runSpeedMultiplier ?? null,
    equipTimeSeconds: row.equipTimeSeconds ?? null,
    reloadTimeSeconds: row.reloadTimeSeconds ?? null,
    firstBulletAccuracy: row.firstBulletAccuracy ?? null,
    shotgunPelletCount: row.shotgunPelletCount ?? null,
    wallPenetration: row.wallPenetration ?? null,
    feature: row.feature ?? null,
    fireMode: row.fireMode ?? null,
    altFireType: row.altFireType ?? null,
    adsStats: row.adsStats ?? null,
    altShotgunStats: row.altShotgunStats ?? null,
    airBurstStats: row.airBurstStats ?? null,
    shopGridRow: row.shopGridRow ?? null,
    shopGridColumn: row.shopGridColumn ?? null,
    displayIcon: row.displayIcon ?? null,
    shopImage: row.shopImage ?? null,
    killStreamIcon: row.killStreamIcon ?? null,
    damageRanges: row.damageRanges.map((r) => ({
      rangeStartMeters: r.rangeStartMeters,
      rangeEndMeters: r.rangeEndMeters,
      headDamage: r.headDamage,
      bodyDamage: r.bodyDamage,
      legDamage: r.legDamage,
    })),
    skinCount,
  };
}

/** Server-side: flatten a weapon's skins (with tier, chromas and levels) into plain props, sorted by tier then name. */
export function toSkinSummaries(row: WeaponDetailRow): SkinSummary[] {
  const skins = row.skins.map<SkinSummary>((s) => ({
    uuid: s.uuid,
    slug: s.slug,
    name: t(s.displayName),
    displayIcon: s.displayIcon ?? s.chromas[0]?.fullRender ?? null,
    wallpaper: s.wallpaper ?? null,
    tier: s.contentTier
      ? { uuid: s.contentTier.uuid, name: t(s.contentTier.displayName), devName: s.contentTier.devName, rank: s.contentTier.rank, color: apiColor(s.contentTier.highlightColor) }
      : null,
    chromas: s.chromas.map((c) => ({ uuid: c.uuid, name: t(c.displayName), fullRender: c.fullRender ?? null, swatch: c.swatch ?? null, video: c.streamedVideo ?? null })),
    levels: s.levels.map((l) => ({ uuid: l.uuid, name: t(l.displayName), levelItem: l.levelItem ?? null, video: l.streamedVideo ?? null })),
  }));
  return skins.sort((a, b) => (b.tier?.rank ?? -1) - (a.tier?.rank ?? -1) || a.name.localeCompare(b.name));
}
