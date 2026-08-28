"use client";

import { animate } from "animejs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ARMOR_HP,
  ARMOR_LABELS,
  type ArmorType,
  computeTtk,
  formatTtk,
  HIT_PROFILE_LABELS,
  type HitLocation,
  type HitProfile,
  HIT_LOCATIONS,
  HIT_PROFILES,
  PLAYER_HEALTH,
  rangeBreakpoints,
  type TtkResult,
} from "@/lib/ttk";
import { HIT_COLORS, HIT_LABELS } from "./hitColors";
import RangeVisualizerScene from "./RangeVisualizerScene.lazy";
import { Segmented } from "./Segmented";
import { CATEGORY_LABELS, formatCredits, groupForBuyMenu } from "./shop";
import type { WeaponSummary } from "./types";
import { useReducedMotion, useWebGL } from "@/hooks";

const MAX_SELECTED = 4;
const DEFAULT_SLUGS = ["vandal", "phantom"];
const ARMORS: ArmorType[] = ["none", "light", "heavy", "regen"];

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Mono number that tweens to each new value with anime.js. */
function AnimatedNumber({ value, decimals = 0, className }: { value: number | null; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value ?? 0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value == null || !Number.isFinite(value)) {
      el.textContent = "—";
      return;
    }
    const from = prev.current;
    prev.current = value;
    if (reduced || from === value) {
      el.textContent = value.toFixed(decimals);
      return;
    }
    const st = { v: from };
    const a = animate(st, { v: value, duration: 700, ease: "outExpo", onUpdate: () => (el.textContent = st.v.toFixed(decimals)) });
    return () => {
      a.cancel();
    };
  }, [value, decimals, reduced]);
  return (
    <span ref={ref} className={className}>
      {value == null ? "—" : value.toFixed(decimals)}
    </span>
  );
}

/** Horizontal bar whose width tweens with anime.js. */
function Bar({ fraction, color }: { fraction: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    if (reduced) {
      el.style.width = w;
      return;
    }
    const a = animate(el, { width: w, duration: 700, ease: "outExpo" });
    return () => {
      a.cancel();
    };
  }, [fraction, reduced]);
  return (
    <div className="h-1.5 w-full bg-line" aria-hidden>
      <div ref={ref} className="h-full" style={{ width: 0, background: color }} />
    </div>
  );
}

type Row = { weapon: WeaponSummary; result: TtkResult; adsApplied: boolean };

export function TtkCalculator({ weapons, initialSlugs }: { weapons: WeaponSummary[]; initialSlugs?: string[] }) {
  const guns = useMemo(() => weapons.filter((w) => w.fireRate && w.damageRanges.length > 0), [weapons]);
  const [selected, setSelected] = useState<string[]>(() => {
    const valid = (initialSlugs ?? []).filter((s) => guns.some((g) => g.slug === s)).slice(0, MAX_SELECTED);
    return valid.length ? valid : DEFAULT_SLUGS.filter((s) => guns.some((g) => g.slug === s));
  });
  const [distance, setDistance] = useState(15);
  const [armor, setArmor] = useState<ArmorType>("heavy");
  const [profile, setProfile] = useState<HitProfile>("body");
  const [ads, setAds] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [sequence, setSequence] = useState(0);
  const reduced = useReducedMotion();
  const webgl = useWebGL();

  const rows = useMemo<Row[]>(
    () =>
      selected.flatMap((slug) => {
        const w = guns.find((g) => g.slug === slug);
        if (!w) return [];
        const adsRate = ads && w.adsStats && w.adsStats.fireRate > 0 && w.adsStats.burstCount <= 1 ? w.adsStats.fireRate : undefined;
        const result = computeTtk(
          {
            name: w.name,
            fireRate: w.fireRate,
            magazineSize: w.magazineSize,
            shotgunPelletCount: w.shotgunPelletCount,
            reloadTimeSeconds: w.reloadTimeSeconds,
            feature: w.feature,
            adsFireRate: w.adsStats?.fireRate ?? null,
            damageRanges: w.damageRanges,
          },
          { distance, armor, profile, fireRate: adsRate },
        );
        return [{ weapon: w, result, adsApplied: adsRate != null }];
      }),
    [selected, guns, distance, armor, profile, ads],
  );

  const focused = rows.find((r) => r.weapon.slug === focus) ?? rows[0] ?? null;
  const maxTtk = Math.max(0.001, ...rows.map((r) => r.result.ttkSeconds ?? 0));
  const bestTtk = Math.min(...rows.map((r) => r.result.ttkSeconds ?? Infinity));
  const breakpoints = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => rangeBreakpoints(r.weapon.damageRanges).forEach((b) => b > 0 && b < 50 && set.add(b)));
    return [...set].sort((a, b) => a - b);
  }, [rows]);
  const zones: HitLocation[] = profile === "head-then-body" ? ["head", "body"] : [profile];
  const groups = useMemo(() => groupForBuyMenu(guns).columns, [guns]);

  const toggle = (slug: string) =>
    setSelected((s) => (s.includes(slug) ? (s.length > 1 ? s.filter((x) => x !== slug) : s) : s.length >= MAX_SELECTED ? s : [...s, slug]));

  return (
    <div className="flex flex-col gap-10">
      {/* Weapon picker */}
      <section aria-labelledby="ttk-pick">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="ttk-pick" className="font-mono text-[11px] uppercase tracking-[0.3em] text-red">
            01 · Weapons
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            {selected.length}/{MAX_SELECTED} selected
          </span>
        </div>
        <div className="chamfer grid gap-4 border border-line bg-ink-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-mute">{g.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.weapons.map((w) => {
                  const on = selected.includes(w.slug);
                  const full = !on && selected.length >= MAX_SELECTED;
                  return (
                    <button
                      key={w.slug}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      onClick={() => toggle(w.slug)}
                      className={cn(
                        "chamfer-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo disabled:cursor-not-allowed disabled:opacity-40",
                        on ? "border-red bg-red text-bone" : "border-line text-bone-2 hover:border-bone-2 hover:text-bone",
                      )}
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Controls */}
      <section aria-labelledby="ttk-controls">
        <h2 id="ttk-controls" className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
          02 · Engagement
        </h2>
        <div className="chamfer grid gap-8 border border-line bg-ink-2 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="ttk-distance" className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
                Distance
              </label>
              <span className="font-mono text-2xl tabular-nums text-bone">
                {distance.toFixed(1)}
                <span className="ml-1 text-sm text-bone-2">m</span>
              </span>
            </div>
            <div className="relative mt-3 pb-7">
              <input
                id="ttk-distance"
                type="range"
                min={0}
                max={50}
                step={0.5}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full accent-red"
              />
              <div aria-hidden className="pointer-events-none absolute inset-x-2 bottom-0 h-6">
                {[0, 50, ...breakpoints].map((b) => (
                  <span key={b} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${(b / 50) * 100}%` }}>
                    <span className={cn("w-px", b === 0 || b === 50 ? "h-1.5 bg-line" : "h-2.5 bg-holo/80")} />
                    <span className={cn("mt-0.5 font-mono text-[9px] tabular-nums", b === 0 || b === 50 ? "text-mute" : "text-holo/80")}>{b}</span>
                  </span>
                ))}
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Cyan ticks are the selected weapons&apos; falloff breakpoints.</p>
          </div>
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Target armor</div>
              <Segmented<ArmorType> label="Target armor" value={armor} onChange={setArmor} options={ARMORS.map((a) => ({ value: a, label: ARMOR_LABELS[a] }))} />
            </div>
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Hits land on</div>
              <Segmented<HitProfile>
                label="Hit profile"
                value={profile}
                onChange={setProfile}
                options={HIT_PROFILES.map((p) => ({ value: p, label: HIT_PROFILE_LABELS[p], swatch: p === "head-then-body" ? HIT_COLORS.head : HIT_COLORS[p] }))}
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-2">
              <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} className="h-4 w-4 accent-red" />
              ADS fire rate <span className="text-mute normal-case tracking-normal">(where the weapon has one; burst ADS not modelled)</span>
            </label>
          </div>
        </div>
      </section>

      {/* Results */}
      <section aria-labelledby="ttk-results">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="ttk-results" className="font-mono text-[11px] uppercase tracking-[0.3em] text-red">
            03 · Time to kill
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            vs {PLAYER_HEALTH} HP + {ARMOR_HP[armor]} armor · {distance.toFixed(1)} m · {HIT_PROFILE_LABELS[profile].toLowerCase()}
          </span>
        </div>
        <div className={cn("grid gap-4", rows.length > 1 && "md:grid-cols-2", rows.length > 2 && "xl:grid-cols-4")} role="list">
          {rows.map((r) => {
            const isFocus = focused?.weapon.slug === r.weapon.slug;
            const best = r.result.ttkSeconds != null && r.result.ttkSeconds === bestTtk && rows.length > 1;
            return (
              <article
                key={r.weapon.slug}
                role="listitem"
                aria-current={isFocus ? "true" : undefined}
                className={cn("chamfer relative flex flex-col gap-5 border bg-ink-3 p-5 transition-colors", isFocus ? "border-red/70" : "border-line")}
              >
                <header className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/weapons/${r.weapon.slug}`} className="display block text-3xl text-bone hover:text-red">
                      {r.weapon.name}
                    </Link>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                      {CATEGORY_LABELS[r.weapon.category] ?? r.weapon.category} · {formatCredits(r.weapon.cost)} cr · {r.result.fireRate.toFixed(2)}/s{r.adsApplied ? " ADS" : ""}
                    </div>
                  </div>
                  {r.weapon.displayIcon && (
                    <span className="relative h-8 w-24 shrink-0">
                      <Image src={r.weapon.displayIcon} alt="" fill sizes="96px" className="object-contain" />
                    </span>
                  )}
                </header>
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Shots</span>
                    <span className="font-mono text-4xl text-bone">
                      <AnimatedNumber value={r.result.shotsToKill} />
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">TTK</span>
                    <span className="font-mono text-4xl text-bone">
                      {r.result.ttkSeconds != null && r.result.ttkSeconds < 1 ? (
                        <>
                          <AnimatedNumber value={r.result.ttkSeconds * 1000} />
                          <span className="ml-1 text-sm text-bone-2">ms</span>
                        </>
                      ) : (
                        <>
                          <AnimatedNumber value={r.result.ttkSeconds} decimals={2} />
                          {r.result.ttkSeconds != null && <span className="ml-1 text-sm text-bone-2">s</span>}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="relative z-10">
                  <Bar fraction={(r.result.ttkSeconds ?? maxTtk) / maxTtk} color={best ? "#41e0c2" : "#ff4655"} />
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
                    <span className={best ? "text-holo" : "text-mute"}>{best ? "Fastest" : r.result.withinMagazine ? "One magazine" : `${r.result.magazinesNeeded ?? "—"} magazines`}</span>
                    {r.result.ttkWithReloadsSeconds != null && r.result.ttkWithReloadsSeconds !== r.result.ttkSeconds && (
                      <span className="text-mute">{formatTtk(r.result.ttkWithReloadsSeconds)} w/ reloads</span>
                    )}
                  </div>
                </div>
                <dl className="relative z-10 grid grid-cols-3 gap-2">
                  {HIT_LOCATIONS.map((k) => (
                    <div key={k} className="flex flex-col gap-0.5">
                      <dt className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-mute">
                        <span className="h-1.5 w-1.5" style={{ background: HIT_COLORS[k] }} />
                        {HIT_LABELS[k]}
                      </dt>
                      <dd className="font-mono text-sm tabular-nums text-bone">{fmt(r.result.damagePerHit[k])}</dd>
                    </div>
                  ))}
                </dl>
                <ol className="relative z-10 flex flex-wrap gap-1" aria-label={`${r.weapon.name} shot timeline`}>
                  {r.result.timeline.slice(0, 30).map((s) => (
                    <li
                      key={s.index}
                      title={`Shot ${s.index + 1} · ${formatTtk(s.timeSeconds)} · ${HIT_LABELS[s.location]} ${fmt(s.rawDamage)} → ${fmt(s.healthAfter)} HP, ${fmt(s.armorAfter)} armor`}
                      className={cn("h-3 w-3", s.healthAfter <= 0 && "ring-2 ring-bone")}
                      style={{ background: HIT_COLORS[s.location], opacity: 0.45 + 0.55 * (1 - s.healthAfter / PLAYER_HEALTH) }}
                    >
                      <span className="sr-only">
                        Shot {s.index + 1} at {formatTtk(s.timeSeconds)}: {HIT_LABELS[s.location]} for {fmt(s.rawDamage)}, {fmt(s.healthAfter)} HP left
                      </span>
                    </li>
                  ))}
                  {r.result.timeline.length > 30 && <li className="font-mono text-[10px] text-mute">+{r.result.timeline.length - 30}</li>}
                </ol>
                {r.result.notes.length > 0 && (
                  <ul className="relative z-10 flex flex-col gap-1 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-mute">
                    {r.result.notes.map((n) => (
                      <li key={n}>· {n}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  aria-pressed={isFocus}
                  onClick={() => setFocus(r.weapon.slug)}
                  className={cn(
                    "chamfer-sm mt-auto inline-flex items-center justify-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo",
                    isFocus ? "border-red/70 bg-red/10 text-red" : "border-line text-bone-2 hover:border-bone-2 hover:text-bone",
                  )}
                >
                  {isFocus ? "On the range" : "Show on range"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Range visualizer */}
      <section aria-labelledby="ttk-range">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="ttk-range" className="font-mono text-[11px] uppercase tracking-[0.3em] text-red">
            04 · Range visualizer
          </h2>
          {focused && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
              Showing {focused.weapon.name} · click a result card to switch
            </span>
          )}
        </div>
        <div className="chamfer relative overflow-hidden border border-line bg-ink">
          <div className="relative h-[380px] sm:h-[460px]">
            {focused && (
              <RangeVisualizerScene distance={distance} zones={zones} shots={focused.result.timeline.slice(0, 60)} sequence={sequence} reduced={reduced} />
            )}
            {webgl === false && (
              <div className="bg-grid absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
                WebGL unavailable — the shot log below has the full playback.
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-holo/80">
                Dummy at {distance.toFixed(1)} m · {zones.map((z) => HIT_LABELS[z]).join(" + ")}
              </div>
              {focused?.result.lethal && sequence > 0 && (
                <div className="chamfer-sm border border-red/60 bg-ink/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-red">
                  Eliminated · {focused.result.shotsToKill} shots · {formatTtk(focused.result.ttkSeconds)}
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSequence((s) => s + 1)}
                disabled={!focused}
                className="chamfer-sm inline-flex items-center gap-2 bg-red px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-bone outline-none transition-colors hover:bg-red-2 focus-visible:ring-1 focus-visible:ring-holo disabled:opacity-40"
              >
                <span aria-hidden>▶</span> Fire {focused?.weapon.name}
              </button>
              {reduced && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Reduced motion: showing the result</span>}
            </div>
          </div>
        </div>

        {focused && (
          <details className="mt-4" open={webgl === false}>
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.25em] text-mute outline-none hover:text-bone focus-visible:text-holo">
              Shot log · {focused.weapon.name}
            </summary>
            <div className="chamfer mt-3 overflow-x-auto border border-line bg-ink-2">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                    <th scope="col" className="px-4 py-2 text-left font-normal">Shot</th>
                    <th scope="col" className="px-4 py-2 text-left font-normal">Time</th>
                    <th scope="col" className="px-4 py-2 text-left font-normal">Hit</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">Damage</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">To armor</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">To health</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">HP left</th>
                    <th scope="col" className="px-4 py-2 text-right font-normal">Armor left</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {focused.result.timeline.map((s) => (
                    <tr key={s.index} className={cn("border-b border-line/60", s.healthAfter <= 0 && "text-red")}>
                      <td className="px-4 py-1.5">{s.index + 1}</td>
                      <td className="px-4 py-1.5">{formatTtk(s.timeSeconds)}</td>
                      <td className="px-4 py-1.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2" style={{ background: HIT_COLORS[s.location] }} />
                          {HIT_LABELS[s.location]}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-right">{fmt(s.rawDamage)}</td>
                      <td className="px-4 py-1.5 text-right">{fmt(s.toArmor)}</td>
                      <td className="px-4 py-1.5 text-right">{fmt(s.toHealth)}</td>
                      <td className="px-4 py-1.5 text-right">{fmt(s.healthAfter)}</td>
                      <td className="px-4 py-1.5 text-right">{fmt(s.armorAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <section className="chamfer border border-line bg-ink-2 p-5 text-sm leading-relaxed text-bone-2 sm:p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">The model</div>
        <p>
          Targets have {PLAYER_HEALTH} HP plus armor (light 25, heavy 50, regen 25 — regen absorbs like light). Armor soaks 66% of each hit until it is gone; whatever it cannot soak goes to health. No rounding is applied inside the simulation — values stay fractional exactly as the game tracks them, and the target dies at 0 HP. TTK is
          measured from the first shot ({"(shots − 1) ÷ fire rate"}), so a one-shot kill is 0 ms. Shotguns count every pellet landing. Spin-up weapons use their base fire rate.
        </p>
      </section>
    </div>
  );
}
