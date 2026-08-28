"use client";

import { createAnimatable } from "animejs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type RailAgent = {
  slug: string;
  name: string;
  role: string | null;
  roleIcon: string | null;
  portrait: string;
  /** CSS colors, already prefixed with '#'. First is dominant. */
  colors: [string, string];
  rightFacing: boolean;
};

/** Horizontal, snap-scrolling row of agent cards that tilt toward the cursor. */
export function AgentRail({ agents }: { agents: RailAgent[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
        <RailButton label="Scroll agents left" onClick={() => scrollBy(-1)}>
          ←
        </RailButton>
        <RailButton label="Scroll agents right" onClick={() => scrollBy(1)}>
          →
        </RailButton>
      </div>
      <div
        ref={scroller}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-2 sm:-mx-6 sm:gap-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {agents.map((a, i) => (
          <AgentCard key={a.slug} agent={a} index={i} tilt={!reduced} />
        ))}
        <div className="w-2 shrink-0 sm:w-4" aria-hidden />
      </div>
    </div>
  );
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="chamfer-sm flex h-9 w-9 items-center justify-center border border-line bg-ink-3 font-mono text-sm text-bone-2 transition-colors hover:border-red hover:text-bone focus-visible:border-holo focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function AgentCard({ agent, index, tilt }: { agent: RailAgent; index: number; tilt: boolean }) {
  const card = useRef<HTMLAnchorElement>(null);
  const anim = useRef<ReturnType<typeof createAnimatable> | null>(null);

  useEffect(() => {
    if (!card.current || !tilt) return;
    anim.current = createAnimatable(card.current, { rotateX: 260, rotateY: 260, scale: 320, ease: "outQuad" });
    return () => {
      anim.current?.revert();
      anim.current = null;
    };
  }, [tilt]);

  const onMove = (e: React.PointerEvent) => {
    const el = card.current;
    const a = anim.current;
    if (!el || !a || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    a.rotateY((px - 0.5) * 16);
    a.rotateX((0.5 - py) * 16);
    a.scale(1.035);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const onLeave = () => {
    const a = anim.current;
    if (!a) return;
    a.rotateX(0);
    a.rotateY(0);
    a.scale(1);
  };

  return (
    <div className="shrink-0 snap-start" style={{ perspective: "1000px" }} data-reveal>
      <Link
        ref={card}
        href={`/agents/${agent.slug}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="chamfer group relative block aspect-[3/4.3] w-[164px] overflow-hidden border border-line bg-ink-3 will-change-transform focus-visible:border-holo focus-visible:outline-none sm:w-[200px] lg:w-[224px]"
        style={{
          background: `linear-gradient(160deg, ${agent.colors[0]} 0%, ${agent.colors[1]} 55%, #0f1923 100%)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* index + role */}
        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-bone/70">
          <span>{String(index + 1).padStart(2, "0")}</span>
          {agent.role && (
            <span className="flex items-center gap-1.5">
              {agent.roleIcon && <Image src={agent.roleIcon} alt="" width={12} height={12} className="h-3 w-3 opacity-80" />}
              {agent.role}
            </span>
          )}
        </div>

        {/* portrait */}
        <div className="absolute inset-0 translate-y-[6%] scale-[1.35] transition-transform duration-700 ease-out-expo group-hover:translate-y-[2%] group-hover:scale-[1.42]">
          <Image
            src={agent.portrait}
            alt={agent.name}
            fill
            sizes="(min-width: 1024px) 224px, (min-width: 640px) 200px, 164px"
            className={`object-cover object-top ${agent.rightFacing ? "-scale-x-100" : ""}`}
          />
        </div>

        {/* glare */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(240px circle at var(--gx, 50%) var(--gy, 50%), rgba(65,224,194,0.18), transparent 60%)" }}
        />

        {/* name */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink via-ink/80 to-transparent px-3 pb-3 pt-10">
          <div className="display text-2xl text-bone sm:text-3xl">{agent.name}</div>
          <div className="mt-1 h-px w-8 bg-red transition-[width] duration-500 ease-out-expo group-hover:w-16" />
        </div>
      </Link>
    </div>
  );
}
