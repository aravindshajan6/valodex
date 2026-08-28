"use client";

import { animate } from "animejs";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { damageRangeAt } from "@/lib/ttk";
import { CATEGORY_LABELS, formatCredits } from "./shop";
import type { WeaponSummary } from "./types";
import { useReducedMotion } from "@/hooks";

type SortKey = "name" | "category" | "cost" | "fireRate" | "magazineSize" | "bodyDamage" | "headDamage" | "wallPenetration";
type Column = { key: SortKey; label: string; numeric?: boolean; unit?: string; hint?: string };

const COLUMNS: Column[] = [
  { key: "name", label: "Weapon" },
  { key: "category", label: "Class" },
  { key: "cost", label: "Cost", numeric: true, unit: "cr" },
  { key: "fireRate", label: "Fire rate", numeric: true, unit: "/s" },
  { key: "magazineSize", label: "Mag", numeric: true },
  { key: "bodyDamage", label: "Body @ 0m", numeric: true, hint: "Body damage at point blank" },
  { key: "headDamage", label: "Head @ 0m", numeric: true, hint: "Head damage at point blank" },
  { key: "wallPenetration", label: "Wall pen" },
];
const PEN_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function cell(w: WeaponSummary, key: SortKey): number | string | null {
  const r0 = damageRangeAt(w.damageRanges, 0);
  switch (key) {
    case "name": return w.name;
    case "category": return CATEGORY_LABELS[w.category] ?? w.category;
    case "cost": return w.cost;
    case "fireRate": return w.fireRate;
    case "magazineSize": return w.magazineSize;
    case "bodyDamage": return r0 ? r0.bodyDamage : null;
    case "headDamage": return r0 ? r0.headDamage : null;
    case "wallPenetration": return w.wallPenetration;
  }
}
function sortValue(w: WeaponSummary, key: SortKey): number | string {
  if (key === "wallPenetration") return PEN_RANK[w.wallPenetration ?? ""] ?? -1;
  const v = cell(w, key);
  return v == null ? -Infinity : v;
}
function fmt(v: number | string | null, key: SortKey): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (key === "cost") return formatCredits(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

/** Sortable spec sheet. Rows FLIP-animate to their new slots on sort. */
export function CompareTable({ weapons }: { weapons: WeaponSummary[] }) {
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "cost", dir: 1 });
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const firstTops = useRef<Map<string, number> | null>(null);

  const rows = useMemo(() => {
    const guns = weapons.filter((w) => w.category !== "melee");
    return guns.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const c = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv);
      return (c || a.name.localeCompare(b.name)) * sort.dir;
    });
  }, [weapons, sort]);

  const onSort = (key: SortKey) => {
    // FIRST: remember where every row is before React re-orders them.
    const tops = new Map<string, number>();
    rowRefs.current.forEach((el, slug) => tops.set(slug, el.getBoundingClientRect().top));
    firstTops.current = tops;
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: COLUMNS.find((c) => c.key === key)?.numeric ? -1 : 1 }));
  };

  useLayoutEffect(() => {
    // LAST + INVERT + PLAY: slide each row from its old slot to its new one.
    const first = firstTops.current;
    firstTops.current = null;
    if (!first || reduced) return;
    const anims = rows.flatMap((w) => {
      const el = rowRefs.current.get(w.slug);
      const before = first.get(w.slug);
      if (!el || before == null) return [];
      const delta = before - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return [];
      return [animate(el, { translateY: [delta, 0], duration: 600, ease: "outExpo" })];
    });
    return () => anims.forEach((a) => a.cancel());
  }, [rows, reduced]);

  return (
    <div className="chamfer overflow-x-auto border border-line bg-ink-2">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <caption className="sr-only">Weapon comparison: fire rate, magazine, damage at point blank, cost and wall penetration. Click a column header to sort.</caption>
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  className={cn("px-4 py-3 text-left font-mono text-[10px] font-normal uppercase tracking-[0.25em]", c.numeric && "text-right")}
                >
                  <button
                    type="button"
                    title={c.hint}
                    onClick={() => onSort(c.key)}
                    className={cn("inline-flex items-center gap-1.5 outline-none transition-colors hover:text-bone focus-visible:text-holo", active ? "text-red" : "text-mute")}
                  >
                    {c.label}
                    <span aria-hidden className={cn("text-[9px] transition-opacity", active ? "opacity-100" : "opacity-30")}>
                      {active && sort.dir === -1 ? "▼" : "▲"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr
              key={w.slug}
              ref={(el) => {
                if (el) rowRefs.current.set(w.slug, el);
                else rowRefs.current.delete(w.slug);
              }}
              className="border-b border-line/60 bg-ink-2 transition-colors hover:bg-ink-3"
            >
              {COLUMNS.map((c) => (
                <td key={c.key} className={cn("px-4 py-2.5 align-middle", c.numeric ? "text-right font-mono tabular-nums text-bone-2" : "text-bone")}>
                  {c.key === "name" ? (
                    <Link href={`/weapons/${w.slug}`} className="group flex items-center gap-3 outline-none">
                      {w.displayIcon && (
                        <span className="relative hidden h-7 w-20 shrink-0 sm:block">
                          <Image src={w.displayIcon} alt="" fill sizes="80px" className="object-contain" />
                        </span>
                      )}
                      <span className="display text-lg text-bone transition-colors group-hover:text-red group-focus-visible:text-holo">{w.name}</span>
                    </Link>
                  ) : c.key === "wallPenetration" ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-2">{fmt(cell(w, c.key), c.key)}</span>
                  ) : (
                    <>
                      {fmt(cell(w, c.key), c.key)}
                      {c.unit && cell(w, c.key) != null && w.cost !== 0 && <span className="ml-1 text-[10px] text-mute">{c.unit}</span>}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
