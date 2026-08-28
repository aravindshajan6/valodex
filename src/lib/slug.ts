export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

/** Assign unique slugs within a batch: duplicates get `-2`, `-3`, ... */
export function uniqueSlugs<T>(items: T[], name: (item: T) => string): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = slugify(name(item));
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** `EWallPenetrationDisplayType::Medium` -> `medium`, `EWeaponStatsFeature::ROFIncrease` -> `rof-increase` */
export function normalizeEnum(value: string | null | undefined): string | null {
  if (!value) return null;
  const tail = value.includes("::") ? value.split("::").pop()! : value;
  return tail
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
