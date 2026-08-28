/**
 * Time-to-kill math for Valorant weapons. Pure functions — no React, no DB —
 * so they can be unit-tested and reused by the detail page and the calculator.
 *
 * The model (quoted verbatim by the UI):
 *
 * - Target: 100 health. Armor: none 0 / light 25 / heavy 50 / regen 25.
 *   The Regen shield absorbs exactly like Light; its regeneration is ignored
 *   inside a single burst.
 * - Armor absorbs 66% of every hit until it is depleted. Whatever the armor
 *   cannot absorb — because it has less than 66% of the hit left — spills into
 *   health:
 *       toArmor  = min(armor, damage × 0.66)
 *       toHealth = damage − toArmor
 * - Rounding: NONE inside the simulation. Every value stays a float and a target
 *   is dead when health ≤ 1e-6 (the epsilon guards float fuzz such as
 *   3 × 33.333… = 99.999…). Valorant keeps fractional damage internally and only
 *   rounds for the kill feed, so per-shot rounding would drift by a bullet on
 *   edge cases (e.g. Classic legs 22.1 × 5 = 110.5). The UI rounds for display.
 * - Shots-to-kill counts hits until lethal. TTK = (shots − 1) / fireRate: the
 *   first shot lands at t = 0 and fire rate is rounds per second.
 * - Shotguns: one "shot" is one shell = pelletCount × per-pellet damage. That is
 *   the optimistic all-pellets-connect model; real spread makes it worse.
 * - `rof-increase` weapons (Odin) use their BASE fire rate; the spun-up rate is
 *   surfaced in `notes` rather than modelled.
 * - Reloads are not part of `ttkSeconds`. `ttkWithReloadsSeconds` adds one
 *   reload per extra magazine when the kill needs more than one magazine.
 */

export type HitLocation = "head" | "body" | "leg";
/** Which hitbox every shot lands on. `head-then-body` = first shot head, rest body. */
export type HitProfile = HitLocation | "head-then-body";
export type ArmorType = "none" | "light" | "heavy" | "regen";

export type DamageRange = {
  rangeStartMeters: number;
  rangeEndMeters: number;
  headDamage: number;
  bodyDamage: number;
  legDamage: number;
};

export const PLAYER_HEALTH = 100;
export const ARMOR_ABSORB = 0.66;
export const ARMOR_HP: Record<ArmorType, number> = { none: 0, light: 25, heavy: 50, regen: 25 };
export const ARMOR_LABELS: Record<ArmorType, string> = { none: "No armor", light: "Light 25", heavy: "Heavy 50", regen: "Regen 25" };
export const HIT_LOCATIONS: readonly HitLocation[] = ["head", "body", "leg"] as const;
export const HIT_PROFILES: readonly HitProfile[] = ["head", "body", "leg", "head-then-body"] as const;
export const HIT_PROFILE_LABELS: Record<HitProfile, string> = { head: "Head", body: "Body", leg: "Legs", "head-then-body": "Head → body" };

const EPS = 1e-6;

export type TtkWeaponInput = {
  name?: string;
  fireRate: number | null;
  magazineSize: number | null;
  shotgunPelletCount?: number | null;
  reloadTimeSeconds?: number | null;
  feature?: string | null;
  /** Spun-up / ADS fire rate, only used for the rof-increase note. */
  adsFireRate?: number | null;
  damageRanges: DamageRange[];
};

export type TtkOptions = {
  /** Metres to the target. Beyond the last range the last range applies. */
  distance: number;
  armor: ArmorType;
  profile: HitProfile;
  /** Override the weapon's fire rate (e.g. ADS rate). */
  fireRate?: number;
  /** Override the pellet count (e.g. Classic alt-fire = 3). */
  pellets?: number;
  /** Safety cap on simulated shots. */
  maxShots?: number;
};

export type TtkShot = {
  /** 0-based shot index. */
  index: number;
  /** Seconds after the first shot. */
  timeSeconds: number;
  location: HitLocation;
  /** Full damage of the hit (all pellets). */
  rawDamage: number;
  toArmor: number;
  toHealth: number;
  healthAfter: number;
  armorAfter: number;
};

export type TtkResult = {
  lethal: boolean;
  /** Null when the weapon cannot kill within `maxShots` (e.g. zero damage). */
  shotsToKill: number | null;
  /** Seconds from the first shot to the killing shot; null when not lethal. */
  ttkSeconds: number | null;
  ttkWithReloadsSeconds: number | null;
  magazinesNeeded: number | null;
  withinMagazine: boolean;
  fireRate: number;
  pellets: number;
  range: DamageRange | null;
  damagePerHit: Record<HitLocation, number>;
  timeline: TtkShot[];
  notes: string[];
};

/** The damage bracket that applies at `distance` (start inclusive, end exclusive; the last bracket extends to infinity). */
export function damageRangeAt(ranges: DamageRange[], distance: number): DamageRange | null {
  if (!ranges.length) return null;
  const sorted = [...ranges].sort((a, b) => a.rangeStartMeters - b.rangeStartMeters);
  for (const r of sorted) if (distance >= r.rangeStartMeters && distance < r.rangeEndMeters) return r;
  const last = sorted[sorted.length - 1];
  return distance >= last.rangeEndMeters ? last : sorted[0];
}

export function damageFor(range: DamageRange, location: HitLocation): number {
  if (location === "head") return range.headDamage;
  if (location === "leg") return range.legDamage;
  return range.bodyDamage;
}

export function locationForShot(profile: HitProfile, index: number): HitLocation {
  if (profile === "head-then-body") return index === 0 ? "head" : "body";
  return profile;
}

/** Apply one hit; see the armor rule in the header comment. */
export function applyHit(health: number, armor: number, damage: number) {
  const toArmor = Math.min(Math.max(0, armor), damage * ARMOR_ABSORB);
  const toHealth = damage - toArmor;
  return { toArmor, toHealth, health: health - toHealth, armor: armor - toArmor };
}

/** Sorted, de-duplicated range boundaries — used for slider ticks and chart axes. */
export function rangeBreakpoints(ranges: DamageRange[]): number[] {
  const set = new Set<number>();
  for (const r of ranges) {
    set.add(r.rangeStartMeters);
    set.add(r.rangeEndMeters);
  }
  return [...set].sort((a, b) => a - b);
}

export function computeTtk(weapon: TtkWeaponInput, opts: TtkOptions): TtkResult {
  const range = damageRangeAt(weapon.damageRanges, opts.distance);
  const pellets = Math.max(1, Math.floor(opts.pellets ?? weapon.shotgunPelletCount ?? 1));
  const fireRate = opts.fireRate ?? weapon.fireRate ?? 0;
  const maxShots = opts.maxShots ?? 200;
  const notes: string[] = [];

  const damagePerHit: Record<HitLocation, number> = {
    head: (range ? range.headDamage : 0) * pellets,
    body: (range ? range.bodyDamage : 0) * pellets,
    leg: (range ? range.legDamage : 0) * pellets,
  };

  let health = PLAYER_HEALTH;
  let armor = ARMOR_HP[opts.armor];
  const timeline: TtkShot[] = [];
  let lethal = false;

  for (let i = 0; i < maxShots; i++) {
    const location = locationForShot(opts.profile, i);
    const raw = damagePerHit[location];
    if (raw <= 0) break;
    const hit = applyHit(health, armor, raw);
    health = hit.health;
    armor = hit.armor;
    timeline.push({
      index: i,
      timeSeconds: fireRate > 0 ? i / fireRate : 0,
      location,
      rawDamage: raw,
      toArmor: hit.toArmor,
      toHealth: hit.toHealth,
      healthAfter: Math.max(0, health),
      armorAfter: Math.max(0, armor),
    });
    if (health <= EPS) {
      lethal = true;
      break;
    }
  }

  const shotsToKill = lethal ? timeline.length : null;
  const ttkSeconds = shotsToKill != null && fireRate > 0 ? (shotsToKill - 1) / fireRate : shotsToKill === 1 ? 0 : null;
  const mag = weapon.magazineSize ?? null;
  const magazinesNeeded = shotsToKill != null && mag ? Math.ceil(shotsToKill / mag) : shotsToKill != null ? 1 : null;
  const withinMagazine = magazinesNeeded == null ? false : magazinesNeeded <= 1;
  const reload = weapon.reloadTimeSeconds ?? 0;
  const ttkWithReloadsSeconds = ttkSeconds != null && magazinesNeeded != null ? ttkSeconds + (magazinesNeeded - 1) * reload : null;

  if (pellets > 1) notes.push(`Shotgun: every shell is counted as all ${pellets} pellets connecting (optimistic).`);
  if (weapon.feature === "rof-increase") {
    const spun = weapon.adsFireRate ? ` (spins up to ${weapon.adsFireRate.toFixed(1)}/s after sustained fire)` : "";
    notes.push(`Uses the base fire rate of ${fireRate.toFixed(2)} rounds/s${spun}.`);
  }
  if (opts.armor === "regen") notes.push("Regen shield modelled like Light (25); regeneration is ignored within a burst.");
  if (shotsToKill != null && !withinMagazine && mag) notes.push(`Needs ${magazinesNeeded} magazines of ${mag}; reload time is added in the with-reloads figure.`);
  if (!lethal) notes.push("Not lethal within the simulated shot cap.");

  return {
    lethal,
    shotsToKill,
    ttkSeconds,
    ttkWithReloadsSeconds,
    magazinesNeeded,
    withinMagazine,
    fireRate,
    pellets,
    range,
    damagePerHit,
    timeline,
    notes,
  };
}

/** Milliseconds, formatted for display ("0 ms", "308 ms", "1.25 s"). */
export function formatTtk(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds >= 1) return `${seconds.toFixed(2)} s`;
  return `${Math.round(seconds * 1000)} ms`;
}
