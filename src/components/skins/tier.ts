/** Shared, framework-free helpers for content tiers (safe in server and client code). */

export type TierInfo = { devName: string; name: string; rank: number; color: string; icon: string | null };

/** `"fad66333"` (RGBA hex, no `#`) -> `"#fad663"`. */
export function hexColor(rgba: string | null | undefined, fallback = "#41e0c2"): string {
  return rgba && rgba.length >= 6 ? `#${rgba.slice(0, 6)}` : fallback;
}

/** Tiers that get the sparkle treatment in the 3D showcase. */
export const SPARKLE_TIERS = new Set(["Exclusive", "Ultra"]);

/** `kill-banner` -> `Kill banner` */
export function humanize(kebab: string | null | undefined): string {
  if (!kebab) return "";
  const s = kebab.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Chroma names sometimes contain literal CR/LF ("Level 4\r\n(Variant 1 Red)"). */
export function oneLine(s: string): string {
  return s.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

export const WEAPON_CATEGORY_ORDER = ["sidearm", "smg", "shotgun", "rifle", "sniper", "heavy", "melee"];
