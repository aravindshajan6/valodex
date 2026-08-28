"use client";

import Image from "next/image";
import { animate, stagger } from "animejs";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { AgentCard } from "./AgentCard";
import type { AgentCardData, RoleOption } from "./types";

const ALL = "all";

/**
 * Role filter bar + card grid. Filtering animates leaving cards out, commits the
 * new set, then staggers the entering cards in — no remount, so hover state and
 * loaded images survive.
 */
export function AgentGrid({ agents, roles }: { agents: AgentCardData[]; roles: RoleOption[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<string>(ALL);
  const [pending, setPending] = useState<string | null>(null);
  const prevVisible = useRef<Set<string>>(new Set(agents.map((a) => a.slug)));
  const reduced = useRef(false);

  const matches = useCallback((a: AgentCardData, r: string) => r === ALL || a.roleUuid === r, []);
  const cardEl = (slug: string) => root.current?.querySelector<HTMLElement>(`[data-slug="${slug}"]`) ?? null;

  // Initial reveal: filter bar + visible cards stagger in (cards carry data-reveal so CSS hides them until now).
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current;
    if (!el) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced.current) {
      targets.forEach((t) => (t.style.opacity = "1"));
      return;
    }
    animate(targets, {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 900,
      delay: stagger(40, { start: 100 }),
      ease: "outExpo",
    });
  }, []);

  // After the role commits, animate the cards that just became visible.
  useLayoutEffect(() => {
    const visible = new Set(agents.filter((a) => matches(a, role)).map((a) => a.slug));
    const entering = [...visible].filter((s) => !prevVisible.current.has(s)).map(cardEl).filter((e): e is HTMLElement => !!e);
    prevVisible.current = visible;
    if (!entering.length || reduced.current) return;
    entering.forEach((e) => {
      e.style.opacity = "0";
    });
    animate(entering, {
      opacity: [0, 1],
      translateY: [28, 0],
      scale: [0.96, 1],
      duration: 700,
      delay: stagger(45),
      ease: "outExpo",
    });
  }, [role, agents, matches]);

  const select = (next: string) => {
    if (next === role || pending) return;
    const leaving = agents
      .filter((a) => matches(a, role) && !matches(a, next))
      .map((a) => cardEl(a.slug))
      .filter((e): e is HTMLElement => !!e);
    if (!leaving.length || reduced.current) {
      setRole(next);
      return;
    }
    setPending(next);
    animate(leaving, {
      opacity: 0,
      translateY: -12,
      scale: 0.97,
      duration: 260,
      delay: stagger(12),
      ease: "inQuad",
      onComplete: () => {
        // Reset so the card is clean if it comes back later.
        leaving.forEach((e) => {
          e.style.transform = "";
        });
        setRole(next);
        setPending(null);
      },
    });
  };

  const current = pending ?? role;
  const options: RoleOption[] = [{ uuid: ALL, name: "All", icon: null }, ...roles];
  const shown = agents.filter((a) => matches(a, role)).length;

  return (
    <div ref={root}>
      <div data-reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = current === o.uuid;
            return (
              <button
                key={o.uuid}
                type="button"
                onClick={() => select(o.uuid)}
                aria-pressed={active}
                className={cn(
                  "chamfer-sm relative inline-flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-[background-color,color,border-color] duration-300 outline-none focus-visible:border-holo",
                  active ? "border-red bg-red text-ink" : "border-line bg-ink-2 text-bone-2 hover:border-bone-2 hover:text-bone",
                )}
              >
                {o.icon && <Image src={o.icon} alt="" width={14} height={14} className={cn("h-3.5 w-3.5", active ? "invert-0 brightness-0" : "opacity-80")} />}
                {o.name}
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute" aria-live="polite">
          <span className="text-bone">{shown}</span> / {agents.length} agents
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {agents.map((a, i) => (
          <li key={a.slug} data-slug={a.slug} data-reveal hidden={!matches(a, role)} className="min-w-0">
            <AgentCard agent={a} priority={i < 4} />
          </li>
        ))}
      </ul>
    </div>
  );
}
