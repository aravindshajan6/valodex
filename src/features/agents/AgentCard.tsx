"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { Badge, FavouriteButton, Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { agentPalette, cardGradient, withAlpha } from "./gradient";
import { roleTone, type AgentCardData } from "./types";

/**
 * Tall chamfered agent card. The portrait sits outside the clipped panel so it
 * breaks the top edge; on hover the card tilts toward the cursor and the
 * portrait parallaxes (driven by CSS vars set from pointer position).
 * The ★ is a sibling of the link, layered above the (pointer-inert) portrait.
 */
export function AgentCard({ agent, className, priority = false }: { agent: AgentCardData; className?: string; priority?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || reduced.current) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    el.style.setProperty("--px", px.toFixed(3));
    el.style.setProperty("--py", py.toFixed(3));
  }, []);
  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  const palette = agentPalette(agent.gradientColors);
  const tone = roleTone(agent.roleName);

  return (
    <div className={cn("relative", className)}>
      <Link
        ref={ref}
        href={`/agents/${agent.slug}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        aria-label={`${agent.name}${agent.roleName ? `, ${agent.roleName}` : ""}`}
        className="group relative block pt-8 outline-none [perspective:1100px] focus-visible:[&_.card-body]:border-red"
        style={{ "--px": 0, "--py": 0 } as React.CSSProperties}
      >
        <div
          className="relative transition-transform duration-500 ease-out-expo will-change-transform [transform-style:preserve-3d]"
          style={{ transform: "rotateX(calc(var(--py) * -7deg)) rotateY(calc(var(--px) * 9deg))" }}
        >
          <Panel className="card-body aspect-[3/4.5] overflow-hidden transition-[border-color,box-shadow] duration-500 group-hover:border-red/70 group-hover:shadow-[0_30px_70px_-30px_rgba(255,70,85,0.45)]">
            {/* Gradient ground + abstract texture. */}
            <div className="absolute inset-0" style={{ backgroundImage: cardGradient(palette) }} aria-hidden />
            {agent.background && (
              <Image
                src={agent.background}
                alt=""
                fill
                sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
                className="object-cover opacity-50 mix-blend-soft-light transition-[opacity,transform] duration-700 group-hover:scale-105 group-hover:opacity-70"
              />
            )}
            <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
            {/* Red hairline at the top that lights up. */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-red opacity-30 transition-[opacity,box-shadow] duration-500 group-hover:opacity-100 group-hover:shadow-[0_0_18px_2px_rgba(255,70,85,0.7)]"
            />
            {/* Accent hairline down the side. */}
            <span aria-hidden className="absolute left-0 top-8 bottom-16 w-px" style={{ background: `linear-gradient(180deg, transparent, ${withAlpha(palette.glow, 0.7)}, transparent)` }} />
            {/* Bottom fade so type stays legible over the portrait. */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/80 to-transparent" aria-hidden />

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={tone} className="bg-ink/70 backdrop-blur-sm">
                  {agent.roleIcon && <Image src={agent.roleIcon} alt="" width={12} height={12} className="h-3 w-3 opacity-90" />}
                  {agent.roleName ?? "Agent"}
                </Badge>
                {agent.developerName && <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-mute sm:inline">{agent.developerName}</span>}
              </div>
              <h3 className="display text-3xl text-bone transition-colors duration-300 group-hover:text-red sm:text-4xl">{agent.name}</h3>
            </div>
          </Panel>

          {/* Portrait: outside the clipped panel so the head breaks the top edge. */}
          {agent.fullPortrait && (
            <div
              className="pointer-events-none absolute inset-x-0 -top-8 bottom-[26%] transition-transform duration-500 ease-out-expo group-hover:[--ps:1.06]"
              style={{ transform: "translate3d(calc(var(--px) * 10px), calc(var(--py) * 8px), 30px) scale(var(--ps, 1))" }}
            >
              <Image
                src={agent.fullPortrait}
                alt={agent.name}
                fill
                priority={priority}
                sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
                className={cn("object-contain object-top drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]", agent.rightFacing && "-scale-x-100")}
              />
            </div>
          )}
        </div>
      </Link>
      <FavouriteButton kind="agents" id={agent.uuid} name={agent.name} className="absolute right-3 top-11 z-10" />
    </div>
  );
}
