"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef, useState } from "react";
import { MapCard, type MapCardData } from "./MapCard";

type Filter = "pool" | "all";

const FILTERS: { id: Filter; label: string; hint: string }[] = [
  { id: "pool", label: "Competitive pool", hint: "has callouts" },
  { id: "all", label: "All maps", hint: "incl. modes" },
];

/** Filterable cinematic grid of map cards. Re-filtering staggers the new cards in. */
export function MapGrid({ maps }: { maps: MapCardData[] }) {
  const [filter, setFilter] = useState<Filter>("pool");
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const visible = filter === "all" ? maps : maps.filter((m) => m.calloutCount > 0);

  useEffect(() => {
    // The first paint is revealed by the surrounding <RevealGroup>; only animate re-filters.
    if (first.current) {
      first.current = false;
      return;
    }
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
    animate(cards, { opacity: [0, 1], translateY: [24, 0], duration: 900, delay: stagger(50), ease: "outExpo" });
  }, [filter]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter maps" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`chamfer-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors outline-none focus-visible:border-holo ${
                  active ? "border-red bg-red/10 text-bone" : "border-line text-bone-2 hover:border-bone-2 hover:text-bone"
                }`}
              >
                {f.label}
                <span className={`ml-2 ${active ? "text-red" : "text-mute"}`}>{f.hint}</span>
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-mute" aria-live="polite">
          {visible.length} / {maps.length} maps
        </span>
      </div>
      <div ref={ref} className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {visible.map((m, i) => (
          <MapCard key={m.slug} map={m} priority={i < 2} />
        ))}
      </div>
    </div>
  );
}
