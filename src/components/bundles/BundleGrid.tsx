"use client";

import { animate, stagger } from "animejs";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BundleCard, type BundleCardData } from "./BundleCard";

/** Searchable bundle grid with a "featured" row (bundles with the most attributable items). */
export function BundleGrid({ bundles, featured }: { bundles: BundleCardData[]; featured: string[] }) {
  const [q, setQ] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const needle = q.trim().toLowerCase();
  const results = useMemo(
    () => (needle ? bundles.filter((b) => b.name.toLowerCase().includes(needle) || b.sub.toLowerCase().includes(needle)) : bundles),
    [bundles, needle],
  );
  const featuredCards = useMemo(() => {
    const byId = new Map(bundles.map((b) => [b.uuid, b]));
    return featured.map((id) => byId.get(id)).filter((b): b is BundleCardData => Boolean(b));
  }, [bundles, featured]);

  useLayoutEffect(() => {
    const root = gridRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-i]");
    if (!targets.length) return;
    animate(targets, { opacity: [0, 1], translateY: [18, 0], duration: 550, delay: stagger(18, { grid: [4, Math.ceil(targets.length / 4)], from: "first" }), ease: "outExpo" });
  }, [needle]);

  return (
    <section aria-label="Bundles">
      <div className="sticky top-16 z-30 border-y border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <label className="relative flex-1 sm:max-w-sm">
            <span className="sr-only">Search bundles</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bundles…"
              className="chamfer-sm w-full border border-line bg-ink-2 px-3 py-2 text-sm text-bone placeholder:text-mute focus:border-holo focus:outline-none"
            />
          </label>
          <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.25em] text-mute" aria-live="polite">
            <span className="text-bone">{results.length}</span> / {bundles.length}
          </span>
        </div>
      </div>

      <div ref={gridRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!needle && featuredCards.length > 0 && (
          <div className="mb-14">
            <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
              <span className="h-px w-8 bg-red" />
              Featured — biggest collections
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {featuredCards.map((b, i) => (
                <BundleCard key={b.uuid} bundle={b} index={i} priority={i < 4} />
              ))}
            </div>
          </div>
        )}

        {!needle && (
          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-mute">
            <span className="h-px w-8 bg-line" />
            All bundles, A–Z
          </div>
        )}

        {results.length === 0 ? (
          <div className="chamfer border border-line bg-ink-3 px-6 py-16 text-center">
            <p className="display text-3xl text-bone">No bundles match</p>
            <p className="mt-2 text-sm text-bone-2">Try another name.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {results.map((b, i) => (
              <BundleCard key={b.uuid} bundle={b} index={(featuredCards.length && !needle ? featuredCards.length : 0) + i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
