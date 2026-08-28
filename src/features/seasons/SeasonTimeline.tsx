"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import type { EpisodeRow } from "./build";

const segmentTone: Record<EpisodeRow["acts"][number]["status"], string> = {
  past: "border-line bg-ink-3 text-mute",
  current: "border-red bg-red/10 text-bone",
  future: "border-dashed border-line/80 bg-transparent text-bone-2",
};

/**
 * Vertical list of episodes; each row is a proportional horizontal bar of acts.
 * Segments draw in (scaleX) and the live act's fill grows when the row scrolls into view.
 */
export function SeasonTimeline({ episodes }: { episodes: EpisodeRow[] }) {
  const root = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));

    // Rows are visible without JS; only once JS is running do we hide them until they scroll in.
    if (!reduced) rows.forEach((r) => (r.style.opacity = "0"));

    const draw = (row: HTMLElement) => {
      const segs = row.querySelectorAll<HTMLElement>("[data-seg]");
      const fills = row.querySelectorAll<HTMLElement>("[data-fill]");
      const marks = row.querySelectorAll<HTMLElement>("[data-mark]");
      if (reduced) {
        segs.forEach((s) => (s.style.transform = "scaleX(1)"));
        fills.forEach((f) => (f.style.width = `${f.dataset.fill}%`));
        marks.forEach((m) => (m.style.opacity = "1"));
        return;
      }
      animate(row, { opacity: [0, 1], translateY: [18, 0], duration: 700, ease: "outExpo" });
      animate(segs, { scaleX: [0, 1], duration: 900, delay: stagger(110, { start: 150 }), ease: "outExpo" });
      fills.forEach((f) => animate(f, { width: ["0%", `${f.dataset.fill}%`], duration: 1400, delay: 500, ease: "outExpo" }));
      if (marks.length) animate(marks, { opacity: [0, 1], translateY: [6, 0], duration: 600, delay: stagger(60, { start: 500 }), ease: "outExpo" });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          draw(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.2 },
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, [episodes]);

  return (
    <ol ref={root} className="flex flex-col gap-4">
      {episodes.map((ep) => (
        <li
          key={ep.uuid}
          data-row
          className={cn(
            "chamfer border bg-ink-2/60 p-4 sm:p-6",
            ep.status === "current" ? "border-red/60" : ep.status === "future" ? "border-dashed border-line" : "border-line",
          )}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className={cn("display text-3xl sm:text-4xl", ep.status === "past" ? "text-bone-2" : "text-bone")}>{ep.name}</h3>
              {ep.title && <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-holo">{ep.title}</span>}
              {ep.status === "current" && <Badge tone="red">Live</Badge>}
              {ep.status === "future" && <Badge>Upcoming</Badge>}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-mute">
              {ep.startLabel} → {ep.endLabel} · {ep.days}d
            </span>
          </div>

          {/* Segments */}
          <div className="flex h-12 w-full gap-1 sm:h-14" role="list" aria-label={`Acts in ${ep.name}`}>
            {ep.acts.map((act) => (
              <div key={act.uuid} role="listitem" style={{ width: `${act.widthPct}%` }} className="min-w-0">
                <div
                  data-seg
                  title={`${act.name}${act.title ? ` — ${act.title}` : ""}: ${act.startLabel} → ${act.endLabel} (${act.days} days)`}
                  className={cn("chamfer-sm relative h-full origin-left overflow-hidden border px-2 py-1 sm:px-3", segmentTone[act.status])}
                  style={{ transform: "scaleX(0)" }}
                >
                  {act.progressPct != null && (
                    <div data-fill={act.progressPct.toFixed(1)} className="absolute inset-y-0 left-0 bg-red/70" style={{ width: "0%" }} aria-hidden />
                  )}
                  <div className="relative flex h-full flex-col justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                      <span className="sm:hidden">{act.short}</span>
                      <span className="hidden sm:inline">{act.name}</span>
                    </span>
                    <span className="hidden font-mono text-[10px] tabular-nums opacity-80 sm:block">
                      {act.status === "current" && act.progressPct != null ? `${Math.round(act.progressPct)}% · ` : ""}
                      {act.days}d
                    </span>
                  </div>
                  <span className="sr-only">
                    {act.status === "current" ? "Current act. " : act.status === "future" ? "Upcoming. " : "Ended. "}
                    {act.startLabel} to {act.endLabel}.
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Event markers */}
          {ep.events.length > 0 && (
            <div className="relative mt-2 h-6">
              {ep.events.map((ev) => (
                <span
                  key={ev.uuid}
                  data-mark
                  tabIndex={0}
                  title={`${ev.name}: ${ev.startLabel} → ${ev.endLabel}`}
                  className="group absolute top-0 -translate-x-1/2 focus-visible:outline-none"
                  style={{ left: `${ev.leftPct}%`, opacity: 0 }}
                >
                  <span aria-hidden className={cn("block h-2 w-2 rotate-45", ev.status === "current" ? "bg-red" : "bg-gold")} />
                  <span className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 whitespace-nowrap border border-line bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-bone group-hover:block group-focus-visible:block">
                    {ev.short}
                  </span>
                  <span className="sr-only">
                    Event: {ev.name}, {ev.startLabel} to {ev.endLabel}
                  </span>
                </span>
              ))}
            </div>
          )}
          {ep.events.length > 0 && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-mute">
              <span className="text-gold">◆</span> {ep.events.map((e) => e.short).join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
