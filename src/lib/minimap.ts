/**
 * Valorant's world → minimap transform, straight from the map record.
 * Returns UV in [0,1] where (0,0) is the top-left of the `displayIcon` minimap image.
 * Note the axis swap: minimap u comes from world y and v from world x.
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
