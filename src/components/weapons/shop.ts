import type { WeaponSummary } from "./types";

/** Column order of the in-game buy menu, keyed by the API's raw `shopCategory`. */
export const SHOP_ORDER = ["Pistols", "SMGs", "Shotguns", "Rifles", "Sniper Rifles", "Heavy Weapons"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  sidearm: "Sidearm",
  smg: "SMG",
  shotgun: "Shotgun",
  rifle: "Rifle",
  sniper: "Sniper",
  heavy: "Heavy",
  melee: "Melee",
};

export const FEATURE_LABELS: Record<string, string> = {
  silenced: "Silenced",
  "rof-increase": "ROF increase",
  "dual-zoom": "Dual zoom",
};

export type ShopColumn = { key: string; label: string; weapons: WeaponSummary[] };

/**
 * Group weapons into buy-menu columns. Within a column the in-game order is by
 * price; the API's `shopGridRow/Column` are used as tie-breakers (they contain
 * collisions and nulls upstream, so they cannot be trusted as absolute slots).
 */
export function groupForBuyMenu(weapons: WeaponSummary[]): { columns: ShopColumn[]; melee: WeaponSummary | null } {
  const columns: ShopColumn[] = [];
  for (const key of SHOP_ORDER) {
    const members = weapons
      .filter((w) => w.shopCategory === key)
      .sort(
        (a, b) =>
          (a.cost ?? 0) - (b.cost ?? 0) ||
          (a.shopGridRow ?? 99) - (b.shopGridRow ?? 99) ||
          (a.shopGridColumn ?? 99) - (b.shopGridColumn ?? 99) ||
          a.name.localeCompare(b.name),
      );
    if (members.length) columns.push({ key, label: members[0].shopCategoryLabel || key, weapons: members });
  }
  // Anything the API files under a category we don't know about still gets a column.
  const known = new Set<string>(SHOP_ORDER);
  const extras = weapons.filter((w) => w.shopCategory && !known.has(w.shopCategory));
  for (const w of extras) {
    const col = columns.find((c) => c.key === w.shopCategory);
    if (col) col.weapons.push(w);
    else columns.push({ key: w.shopCategory!, label: w.shopCategoryLabel || w.shopCategory!, weapons: [w] });
  }
  const melee = weapons.find((w) => w.category === "melee") ?? null;
  return { columns, melee };
}

export function formatCredits(cost: number | null | undefined): string {
  if (cost == null) return "—";
  if (cost === 0) return "FREE";
  return cost.toLocaleString("en-US");
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}
