"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import RankScene from "./RankScene.lazy";
import { RankLadder } from "./RankLadder";
import type { LadderTier } from "./types";

/** Shared selection state between the 3D helix and its DOM ladder. */
export function RankAscension({ tiers }: { tiers: LadderTier[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const focus = active ?? hovered;
  const focused = focus != null ? tiers[focus] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div data-reveal className="chamfer relative aspect-[4/5] w-full overflow-hidden border border-line bg-ink sm:aspect-square lg:aspect-auto lg:h-[720px]">
          <RankScene tiers={tiers} activeIndex={active} hoveredIndex={hovered} onSelect={setActive} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <Badge tone="holo">Ascension · {tiers.length} tiers</Badge>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-mute sm:block">{active == null ? "auto orbit" : "locked"}</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 sm:p-6" aria-live="polite">
            {focused ? (
              <div className="flex items-center gap-3">
                <span className="h-10 w-2 chamfer-sm" style={{ background: focused.color }} aria-hidden />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: focused.color }}>
                    {focused.divisionName} · tier {focused.tier}
                  </div>
                  <div className="display text-3xl text-bone sm:text-4xl">{focused.name}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-red">Iron 1 → Radiant</div>
                <div className="display text-3xl text-bone sm:text-4xl">Pick a tier</div>
              </div>
            )}
            {active != null && (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="pointer-events-auto chamfer-sm border border-line bg-ink-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2 transition-colors hover:border-red hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo"
              >
                Reset view
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Click a plate or a tier to fly the camera to it. Higher tiers glow.</p>
      </div>
      <RankLadder tiers={tiers} activeIndex={active} onSelect={setActive} onHover={setHovered} />
    </div>
  );
}
