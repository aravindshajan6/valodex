"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import type { LadderTier } from "./types";

type Props = {
  tiers: LadderTier[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  onHover: (index: number | null) => void;
};

/** DOM twin of the 3D helix: every plate is a real button, grouped by division. */
export function RankLadder({ tiers, activeIndex, onSelect, onHover }: Props) {
  const groups: Array<{ division: string; name: string; color: string; background: string; items: Array<{ tier: LadderTier; index: number }> }> = [];
  tiers.forEach((tier, index) => {
    const last = groups[groups.length - 1];
    if (last && last.division === tier.division) last.items.push({ tier, index });
    else groups.push({ division: tier.division, name: tier.divisionName, color: tier.color, background: tier.background, items: [{ tier, index }] });
  });

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Competitive tiers">
      {[...groups].reverse().map((g, gi) => (
        <div key={g.division} data-reveal className="chamfer-sm border border-line bg-ink-2/60 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 chamfer-sm" style={{ background: g.color }} aria-hidden />
              <span className="display text-xl text-bone">{g.name}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
              {g.items.length === 1 ? `Tier ${g.items[0].tier.tier}` : `Tiers ${g.items[0].tier.tier}–${g.items[g.items.length - 1].tier.tier}`}
              <span className="sr-only">, division {groups.length - gi} of {groups.length}</span>
            </span>
          </div>
          <div className={cn("grid gap-2", g.items.length === 1 ? "grid-cols-1" : "grid-cols-3")}>
            {g.items.map(({ tier, index }) => {
              const active = activeIndex === index;
              return (
                <button
                  key={tier.tier}
                  id={`tier-${tier.tier}`}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${tier.name}, tier ${tier.tier}`}
                  onClick={() => onSelect(active ? null : index)}
                  onMouseEnter={() => onHover(index)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(index)}
                  onBlur={() => onHover(null)}
                  className={cn(
                    "group chamfer-sm flex items-center gap-2 border bg-ink-3 px-2 py-2 text-left transition-[border-color,background-color,transform] duration-300 ease-out-expo",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo",
                    active ? "-translate-y-0.5 bg-ink" : "border-line hover:border-bone-2/40",
                  )}
                  style={active ? { borderColor: g.color, boxShadow: `0 12px 40px -18px ${g.color}` } : undefined}
                >
                  {tier.smallIcon ? (
                    <Image src={tier.smallIcon} alt="" width={36} height={36} sizes="36px" className="h-9 w-9 shrink-0 object-contain" />
                  ) : (
                    <span className="h-9 w-9 shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] uppercase tracking-[0.15em] text-bone">{tier.name}</span>
                    <span className="block font-mono text-[10px] text-mute">#{tier.tier}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
