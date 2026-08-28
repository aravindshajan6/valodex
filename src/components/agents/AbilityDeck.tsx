"use client";

import Image from "next/image";
import { animate, stagger } from "animejs";
import { useEffect, useRef, useState } from "react";
import { Badge, Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SLOT_LABEL } from "./abilities";
import { withAlpha } from "./gradient";
import type { AbilityData } from "./types";

/**
 * Kit explorer: a row/column of ability cards plus a side panel that shows the
 * active ability large. Hover, focus or click activates; arrow keys move.
 */
export function AbilityDeck({ abilities, accent, glow }: { abilities: AbilityData[]; accent: string; glow: string }) {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const reduced = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Animate the side panel content and pulse the active card's icon on change.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced.current) return;
    const p = panel.current;
    if (p) {
      const parts = p.querySelectorAll<HTMLElement>("[data-part]");
      animate(parts, { opacity: [0, 1], translateY: [14, 0], filter: ["blur(4px)", "blur(0px)"], duration: 600, delay: stagger(60), ease: "outExpo" });
    }
    const icon = cards.current[active]?.querySelector<HTMLElement>("[data-icon]");
    if (icon) animate(icon, { scale: [0.82, 1], rotate: [-6, 0], duration: 700, ease: "outElastic(1, .6)" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = abilities.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (active + 1) % n;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (active - 1 + n) % n;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = n - 1;
    if (next !== null) {
      e.preventDefault();
      setActive(next);
      cards.current[next]?.focus();
    }
  };

  const current = abilities[active];
  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      <div role="tablist" aria-label="Abilities" aria-orientation="vertical" onKeyDown={onKey} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {abilities.map((ab, i) => {
          const isActive = i === active;
          return (
            <button
              key={ab.slot}
              ref={(el) => {
                cards.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`ability-tab-${ab.slot}`}
              aria-selected={isActive}
              aria-controls="ability-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={cn(
                "chamfer group relative flex w-full items-center gap-4 border bg-ink-3 p-3 text-left outline-none transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out-expo sm:p-4",
                isActive
                  ? "border-red bg-ink-2 shadow-[0_20px_50px_-25px_rgba(255,70,85,0.6)] lg:translate-x-2"
                  : "border-line hover:border-bone-2/40 focus-visible:border-holo",
              )}
            >
              <span
                className={cn(
                  "chamfer-sm relative flex h-14 w-14 shrink-0 items-center justify-center border bg-ink transition-[box-shadow,border-color] duration-300 sm:h-16 sm:w-16",
                  isActive ? "border-red/70" : "border-line",
                )}
                style={isActive ? { boxShadow: `0 0 28px -4px rgba(255,70,85,0.55), inset 0 0 20px ${withAlpha(glow, 0.25)}` } : undefined}
              >
                <span
                  aria-hidden
                  className={cn("absolute inset-0 transition-opacity duration-300", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60")}
                  style={{ background: `radial-gradient(60% 60% at 50% 50%, ${withAlpha(accent, 0.45)} 0%, transparent 70%)` }}
                />
                {ab.icon && <Image data-icon src={ab.icon} alt="" width={36} height={36} className="relative h-8 w-8 sm:h-9 sm:w-9" />}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 font-mono text-[10px] font-semibold",
                    ab.key ? "bg-red text-ink" : "bg-line text-bone-2",
                  )}
                >
                  {ab.key ?? "P"}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-mute">{SLOT_LABEL[ab.slot]}</span>
                <span className={cn("display block truncate text-xl transition-colors sm:text-2xl", isActive ? "text-red" : "text-bone")}>{ab.name}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Panel className="relative overflow-hidden p-6 sm:p-8 lg:sticky lg:top-24 lg:self-start">
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(80% 60% at 100% 0%, ${withAlpha(accent, 0.35)} 0%, transparent 65%)` }} />
        <div aria-hidden className="bg-grid absolute inset-0 opacity-40" />
        <div ref={panel} id="ability-panel" role="tabpanel" aria-labelledby={`ability-tab-${current.slot}`} className="relative">
          <div data-part className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge tone={current.key ? "red" : "neutral"}>{current.key ? `Key ${current.key}` : "Passive"}</Badge>
              <Badge tone="neutral">{SLOT_LABEL[current.slot]}</Badge>
            </div>
            {current.icon && (
              <span className="chamfer-sm flex h-16 w-16 shrink-0 items-center justify-center border border-line bg-ink sm:h-20 sm:w-20" style={{ boxShadow: `inset 0 0 30px ${withAlpha(glow, 0.3)}` }}>
                <Image src={current.icon} alt="" width={44} height={44} className="h-10 w-10 sm:h-11 sm:w-11" />
              </span>
            )}
          </div>
          <h3 data-part className="display mt-6 text-4xl text-bone sm:text-5xl lg:text-6xl">
            {current.name}
          </h3>
          <p data-part className="mt-5 max-w-prose text-base leading-relaxed text-bone-2 sm:text-lg">
            {current.description}
          </p>
          {current.key && (
            <p data-part className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
              Press <kbd className="mx-1 inline-block bg-red px-1.5 py-0.5 font-semibold text-ink">{current.key}</kbd> to cast
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
