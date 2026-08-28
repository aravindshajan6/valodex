"use client";

import { animate, stagger } from "animejs";
import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SkinCard, type SkinCardData } from "./SkinCard";
import { WEAPON_CATEGORY_ORDER, type TierInfo } from "./tier";

export type BrowserSkin = { uuid: string; name: string; slug: string; weapon: string; tier: string; icon: string | null; hasVideo: boolean };
export type WeaponOption = { slug: string; name: string; icon: string | null; category: string; count: number };

const PAGE = 60;
type Sort = "tier" | "name" | "weapon";

export function SkinBrowser({ skins, tiers, weapons }: { skins: BrowserSkin[]; tiers: TierInfo[]; weapons: WeaponOption[] }) {
  const [q, setQ] = useState("");
  const [weapon, setWeapon] = useState<string>("");
  const [tierSet, setTierSet] = useState<Set<string>>(() => new Set());
  const [videoOnly, setVideoOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("tier");
  const [shown, setShown] = useState(PAGE);
  const [weaponOpen, setWeaponOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const weaponRef = useRef<HTMLDivElement>(null);
  const animateFrom = useRef(0);
  const lastKey = useRef<string | null>(null);

  const tierByName = useMemo(() => new Map(tiers.map((t) => [t.devName, t])), [tiers]);
  const weaponBySlug = useMemo(() => new Map(weapons.map((w) => [w.slug, w])), [weapons]);

  // Deep-link support (`/skins?weapon=vandal&tier=Ultra`) without making the page
  // dynamic: treat the URL as an external store — apply on mount and on history moves.
  useEffect(() => {
    const applyUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const w = params.get("weapon");
      if (w && weaponBySlug.has(w)) setWeapon(w);
      const tier = params.get("tier");
      if (tier && tierByName.has(tier)) setTierSet(new Set([tier]));
    };
    window.addEventListener("popstate", applyUrl);
    const id = window.requestAnimationFrame(applyUrl);
    return () => { window.removeEventListener("popstate", applyUrl); window.cancelAnimationFrame(id); };
  }, [weaponBySlug, tierByName]);

  // Close the weapon menu on outside click / Escape.
  useEffect(() => {
    if (!weaponOpen) return;
    const onDown = (e: MouseEvent) => { if (weaponRef.current && !weaponRef.current.contains(e.target as Node)) setWeaponOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWeaponOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [weaponOpen]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = skins.filter((s) => {
      if (weapon && s.weapon !== weapon) return false;
      if (tierSet.size && !tierSet.has(s.tier)) return false;
      if (videoOnly && !s.hasVideo) return false;
      if (needle && !s.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    const rank = (s: BrowserSkin) => tierByName.get(s.tier)?.rank ?? -1;
    const cat = (s: BrowserSkin) => WEAPON_CATEGORY_ORDER.indexOf(weaponBySlug.get(s.weapon)?.category ?? "");
    out.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "weapon") return cat(a) - cat(b) || a.weapon.localeCompare(b.weapon) || rank(b) - rank(a) || a.name.localeCompare(b.name);
      return rank(b) - rank(a) || a.name.localeCompare(b.name);
    });
    return out;
  }, [skins, q, weapon, tierSet, videoOnly, sort, tierByName, weaponBySlug]);

  // Any filter change restarts pagination and re-animates the whole grid.
  const filterKey = `${q}|${weapon}|${[...tierSet].join(",")}|${videoOnly}|${sort}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (prevKey !== filterKey) {
    setPrevKey(filterKey);
    setShown(PAGE);
  }

  const visible = filtered.slice(0, shown);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    // A filter change re-animates the whole grid; "load more" only animates the new chunk.
    const from = lastKey.current === filterKey ? animateFrom.current : 0;
    lastKey.current = filterKey;
    animateFrom.current = visible.length;
    const targets = Array.from(grid.querySelectorAll<HTMLElement>("[data-i]")).filter((el) => Number(el.dataset.i) >= from);
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(targets, { opacity: [0, 1], translateY: [18, 0], duration: 550, delay: stagger(22), ease: "outExpo" });
  }, [visible.length, filterKey]);

  const toggleTier = (name: string) =>
    setTierSet((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  const reset = () => { setQ(""); setWeapon(""); setTierSet(new Set()); setVideoOnly(false); setSort("tier"); };
  const active = Boolean(q || weapon || tierSet.size || videoOnly);
  const selectedWeapon = weapon ? weaponBySlug.get(weapon) : undefined;

  const cards: SkinCardData[] = visible.map((s) => ({
    uuid: s.uuid,
    name: s.name,
    href: `/skins/${s.weapon}/${s.slug}`,
    icon: s.icon,
    weaponName: weaponBySlug.get(s.weapon)?.name ?? s.weapon,
    tier: tierByName.get(s.tier) ?? null,
    hasVideo: s.hasVideo,
  }));

  return (
    <section aria-label="Skin browser">
      {/* ---- sticky filter bar ------------------------------------------------ */}
      <div className="sticky top-16 z-30 border-y border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4">
          <label className="relative flex-1 lg:max-w-xs">
            <span className="sr-only">Search skins</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skins…"
              className="chamfer-sm w-full border border-line bg-ink-2 px-3 py-2 text-sm text-bone placeholder:text-mute focus:border-holo focus:outline-none"
            />
          </label>

          {/* Weapon dropdown with icons */}
          <div ref={weaponRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={weaponOpen}
              onClick={() => setWeaponOpen((o) => !o)}
              className={cn(
                "chamfer-sm flex h-10 w-full items-center gap-2 border bg-ink-2 px-3 text-left text-sm lg:w-52",
                weapon ? "border-holo/60 text-bone" : "border-line text-bone-2 hover:text-bone",
              )}
            >
              {selectedWeapon?.icon ? (
                <Image src={selectedWeapon.icon} alt="" width={40} height={16} className="h-4 w-10 object-contain" />
              ) : (
                <span className="inline-block h-4 w-10 border border-dashed border-line" aria-hidden />
              )}
              <span className="flex-1 truncate">{selectedWeapon?.name ?? "All weapons"}</span>
              <span aria-hidden className="font-mono text-[10px] text-mute">{weaponOpen ? "▲" : "▼"}</span>
            </button>
            {weaponOpen && (
              <div
                role="listbox"
                aria-label="Weapon"
                className="chamfer absolute left-0 top-12 z-40 grid w-[min(92vw,34rem)] grid-cols-2 gap-1 border border-line bg-ink-2 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:grid-cols-3"
              >
                <WeaponOpt selected={!weapon} onSelect={() => { setWeapon(""); setWeaponOpen(false); }} label="All weapons" count={skins.length} />
                {weapons.map((w) => (
                  <WeaponOpt key={w.slug} selected={weapon === w.slug} onSelect={() => { setWeapon(w.slug); setWeaponOpen(false); }} label={w.name} icon={w.icon} count={w.count} />
                ))}
              </div>
            )}
          </div>

          {/* Tier chips */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tier">
            {tiers.map((t) => {
              const on = tierSet.has(t.devName);
              return (
                <button
                  key={t.devName}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTier(t.devName)}
                  style={{ "--tier": t.color } as React.CSSProperties}
                  className={cn(
                    "chamfer-sm flex h-8 items-center gap-1.5 border px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                    on ? "border-(color:--tier) bg-(color:--tier)/15 text-bone" : "border-line text-bone-2 hover:border-(color:--tier) hover:text-bone",
                  )}
                >
                  <span aria-hidden className="h-2 w-2" style={{ background: t.color }} />
                  {t.devName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <button
              type="button"
              aria-pressed={videoOnly}
              onClick={() => setVideoOnly((v) => !v)}
              className={cn(
                "chamfer-sm flex h-8 items-center gap-2 border px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                videoOnly ? "border-holo bg-holo/10 text-holo" : "border-line text-bone-2 hover:text-bone",
              )}
            >
              <span aria-hidden className={cn("h-2 w-2", videoOnly ? "bg-holo" : "bg-line")} />
              Has video
            </button>
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="chamfer-sm h-8 border border-line bg-ink-2 px-2 text-[11px] normal-case tracking-normal text-bone focus:border-holo focus:outline-none"
              >
                <option value="tier">Tier, highest first</option>
                <option value="name">Name A–Z</option>
                <option value="weapon">Weapon</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ---- results ----------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
          <span aria-live="polite">
            <span className="text-bone">{filtered.length.toLocaleString()}</span> / {skins.length.toLocaleString()} skins
          </span>
          {active && (
            <button type="button" onClick={reset} className="text-red hover:text-bone">
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="chamfer border border-line bg-ink-3 px-6 py-16 text-center">
            <p className="display text-3xl text-bone">No skins match</p>
            <p className="mt-2 text-sm text-bone-2">Try a different weapon, tier, or search term.</p>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {cards.map((c, i) => (
              <SkinCard key={c.uuid} skin={c} index={i} priority={i < 4} />
            ))}
          </div>
        )}

        {shown < filtered.length && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="chamfer border border-red bg-red/10 px-8 py-3 font-mono text-xs uppercase tracking-[0.25em] text-bone transition-colors hover:bg-red hover:text-ink"
            >
              Load {Math.min(PAGE, filtered.length - shown)} more
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function WeaponOpt({ selected, onSelect, label, icon, count }: { selected: boolean; onSelect: () => void; label: string; icon?: string | null; count: number }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "chamfer-sm flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors",
        selected ? "bg-holo/10 text-holo" : "text-bone-2 hover:bg-ink-3 hover:text-bone",
      )}
    >
      {icon ? <Image src={icon} alt="" width={44} height={18} className="h-[18px] w-11 object-contain" /> : <span className="inline-block h-[18px] w-11" aria-hidden />}
      <span className="flex-1 truncate">{label}</span>
      <span className="font-mono text-[10px] text-mute">{count}</span>
    </button>
  );
}
