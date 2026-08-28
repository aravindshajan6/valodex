/**
 * Valorant's world → minimap transform, straight from the map record.
 * Returns UV in [0,1] where (0,0) is the top-left of the `displayIcon` minimap image.
 * Note the axis swap: minimap u comes from world y and v from world x.
 *
 * Verified empirically (2026-08) by rasterising every Ascent callout onto the
 * 1024² `displayIcon` PNG: "A Site" / "A Garden" / "A Rafters" land inside the
 * top-left site square, "B Site" in the bottom-left site square, "B Boat House"
 * on the bottom stub, the Mid callouts along the central corridors, attacker
 * spawn on the right lobe and defender spawn on the left lobe — i.e. exactly the
 * in-game minimap orientation. No axis flip is required; use the UVs directly
 * with v measured downward from the top of the image.
 */
export function worldToMinimap(
  world: { x: number; y: number },
  map: { xMultiplier: number | null; yMultiplier: number | null; xScalarToAdd: number | null; yScalarToAdd: number | null },
) {
  return {
    u: world.y * (map.xMultiplier ?? 0) + (map.xScalarToAdd ?? 0),
    v: world.x * (map.yMultiplier ?? 0) + (map.yScalarToAdd ?? 0),
  };
}

type Transform = { xMultiplier: number | null; yMultiplier: number | null; xScalarToAdd: number | null; yScalarToAdd: number | null };

/**
 * Team-deathmatch maps (district, drift, kasbah) ship callouts but an all-zero
 * transform, so every callout would collapse onto one point. Only trust the
 * projection when both multipliers are non-zero.
 */
export function hasMinimapTransform(map: Transform) {
  return Boolean(map.xMultiplier && map.yMultiplier);
}

/** Callout super regions in display order. */
export const SUPER_REGION_ORDER = ["a", "b", "c", "mid", "attacker-side", "defender-side"] as const;
export type SuperRegion = (typeof SUPER_REGION_ORDER)[number];

/** Hex colour for a super region — A red, B holo, C gold, Mid bone, spawn sides muted. */
export function superRegionColor(superRegion: string): string {
  switch (superRegion) {
    case "a": return "#ff4655";
    case "b": return "#41e0c2";
    case "c": return "#f0c987";
    case "mid": return "#ece8e1";
    default: return "#768079";
  }
}

/** Badge tone for a super region (matches `superRegionColor`). */
export function superRegionTone(superRegion: string): "red" | "holo" | "gold" | "neutral" {
  switch (superRegion) {
    case "a": return "red";
    case "b": return "holo";
    case "c": return "gold";
    default: return "neutral";
  }
}

/** A callout resolved to plain, serialisable values for client components. */
export type ProjectedCallout = {
  id: number;
  name: string;
  superRegion: string;
  superRegionName: string;
  /** Minimap UV in [0,1]; v grows downward. */
  u: number;
  v: number;
  /** World height in Unreal units. */
  z: number;
  /** Height normalised across the map's callouts to [0,1]. */
  zNorm: number;
};

/**
 * Project a map's callouts onto its minimap and normalise their heights.
 * Sorted by super region order, then name, so lists and pins agree.
 */
export function projectCallouts(
  map: Transform,
  callouts: { id: number; name: string; superRegion: string; superRegionName: string; x: number; y: number; z: number }[],
): ProjectedCallout[] {
  if (!callouts.length) return [];
  const zs = callouts.map((c) => c.z);
  const minZ = Math.min(...zs);
  const range = Math.max(...zs) - minZ || 1;
  const rank = (s: string) => {
    const i = (SUPER_REGION_ORDER as readonly string[]).indexOf(s);
    return i === -1 ? SUPER_REGION_ORDER.length : i;
  };
  return callouts
    .map((c) => {
      const { u, v } = worldToMinimap(c, map);
      return { id: c.id, name: c.name, superRegion: c.superRegion, superRegionName: c.superRegionName, u, v, z: c.z, zNorm: (c.z - minZ) / range };
    })
    .sort((a, b) => rank(a.superRegion) - rank(b.superRegion) || a.name.localeCompare(b.name));
}
