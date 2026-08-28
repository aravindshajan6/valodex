/** Plain, serialisable tier for the ladder + 3D scene (server → client props). */

export { rgbaHex } from "@/lib/color";
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



/** `Episode5_CompetitiveTierDataTable` → `Episode 5` */
export function tierSetLabel(assetObjectName: string, order: number): string {
  const m = assetObjectName.match(/Episode(\d+)/i);
  return m ? `Episode ${m[1]}` : `Set ${order + 1}`;
}
