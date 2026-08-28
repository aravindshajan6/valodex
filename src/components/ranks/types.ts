/** Plain, serialisable tier for the ladder + 3D scene (server → client props). */
export type LadderTier = {
  tier: number;
  name: string;
  division: string;
  divisionName: string;
  /** `#rrggbb` */
  color: string;
  /** `#rrggbb` */
  background: string;
  smallIcon: string | null;
  largeIcon: string | null;
};

/** `6ae2afff` → `#6ae2af`; falls back to bone when the API gives nothing. */
export function rgbaHex(value: string | null | undefined, fallback = "#ece8e1"): string {
  if (!value || value.length < 6) return fallback;
  return `#${value.slice(0, 6)}`;
}

/** `Episode5_CompetitiveTierDataTable` → `Episode 5` */
export function tierSetLabel(assetObjectName: string, order: number): string {
  const m = assetObjectName.match(/Episode(\d+)/i);
  return m ? `Episode ${m[1]}` : `Set ${order + 1}`;
}
