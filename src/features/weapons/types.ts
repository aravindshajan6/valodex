import type { DamageRange } from "@/lib/ttk";

export type { DamageRange };

export type AdsStats = { zoomMultiplier: number; fireRate: number; runSpeedMultiplier: number; burstCount: number; firstBulletAccuracy: number };
export type AltShotgunStats = { shotgunPelletCount: number; burstRate: number };
export type AirBurstStats = { shotgunPelletCount: number; burstDistance: number };

/** Plain, already-localised weapon record — safe to pass to client components. */
export type WeaponSummary = {
  uuid: string;
  slug: string;
  name: string;
  /** heavy | melee | rifle | smg | shotgun | sidearm | sniper */
  category: string;
  /** Raw shop group from the API: Pistols | SMGs | Shotguns | Rifles | Sniper Rifles | Heavy Weapons */
  shopCategory: string | null;
  /** Localised shop group label ("Sidearms", "Assault Rifles"...). */
  shopCategoryLabel: string;
  cost: number | null;
  fireRate: number | null;
  magazineSize: number | null;
  runSpeedMultiplier: number | null;
  equipTimeSeconds: number | null;
  reloadTimeSeconds: number | null;
  firstBulletAccuracy: number | null;
  shotgunPelletCount: number | null;
  wallPenetration: string | null;
  feature: string | null;
  fireMode: string | null;
  altFireType: string | null;
  adsStats: AdsStats | null;
  altShotgunStats: AltShotgunStats | null;
  airBurstStats: AirBurstStats | null;
  shopGridRow: number | null;
  shopGridColumn: number | null;
  displayIcon: string | null;
  shopImage: string | null;
  killStreamIcon: string | null;
  damageRanges: DamageRange[];
  skinCount: number;
};

export type SkinTier = { uuid: string; name: string; devName: string; rank: number; color: string | null };
export type SkinChroma = { uuid: string; name: string; fullRender: string | null; swatch: string | null; video: string | null };
export type SkinLevel = { uuid: string; name: string; levelItem: string | null; video: string | null };
export type SkinSummary = {
  uuid: string;
  slug: string;
  name: string;
  displayIcon: string | null;
  wallpaper: string | null;
  tier: SkinTier | null;
  chromas: SkinChroma[];
  levels: SkinLevel[];
};
