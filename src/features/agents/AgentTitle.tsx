"use client";

import Image from "next/image";
import { createTimeline, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { Badge, FavouriteButton, Panel } from "@/components/ui";
import { roleTone } from "./types";

type Props = {
  uuid: string;
  name: string;
  eyebrow: string;
  description: string;
  role: { name: string; icon: string | null; description: string } | null;
  tags: string[];
  releaseYear: number | null;
  abilityCount: number;
};

/**
 * Detail-page headline block. The Anton name enters letter-by-letter on an
 * anime.js timeline, then the eyebrow, copy and role card follow. Elements are
 * marked `data-reveal` so CSS hides them until the timeline runs (and shows them
 * instantly for reduced-motion users).
 */
export function AgentTitle({ uuid, name, eyebrow, description, role, tags, releaseYear, abilityCount }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    const lines = Array.from(el.querySelectorAll<HTMLElement>("[data-line]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      [...letters, ...lines].forEach((n) => (n.style.opacity = "1"));
      return;
    }
    const tl = createTimeline({ defaults: { ease: "outExpo" } });
    tl.add(
      letters,
      {
        opacity: [0, 1],
        translateY: ["0.55em", "0em"],
        rotateX: [-75, 0],
        filter: ["blur(10px)", "blur(0px)"],
        duration: 950,
        delay: stagger(42),
      },
      150,
    ).add(
      lines,
      { opacity: [0, 1], translateY: [18, 0], filter: ["blur(6px)", "blur(0px)"], duration: 800, delay: stagger(90) },
      "-=650",
    );
    return () => {
      tl.pause();
    };
  }, [name]);

  const chars = Array.from(name);

  return (
    <div ref={root} className="flex flex-col gap-8">
      <div>
        <div data-line data-reveal className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
          <span className="h-px w-8 bg-red" />
          {eyebrow}
        </div>
        <h1
          className="display text-[clamp(4.5rem,15vw,11.5rem)] text-bone [perspective:700px]"
          aria-label={name}
        >
          {chars.map((c, i) => (
            <span
              key={i}
              data-letter
              data-reveal
              aria-hidden
              className="inline-block origin-bottom will-change-transform"
            >
              {c === " " ? " " : c}
            </span>
          ))}
        </h1>
      </div>

      <p data-line data-reveal className="max-w-xl text-base leading-relaxed text-bone-2 sm:text-lg">
        {description}
      </p>

      <div data-line data-reveal>
        <FavouriteButton kind="agents" id={uuid} name={name} variant="pill" />
      </div>

      {tags.length > 0 && (
        <div data-line data-reveal className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} tone="holo">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div data-line data-reveal className="flex flex-wrap items-stretch gap-4">
        {role && (
          <Panel className="flex min-w-[260px] flex-1 items-center gap-4 p-4">
            <span className="chamfer-sm flex h-14 w-14 shrink-0 items-center justify-center border border-line bg-ink-2">
              {role.icon && <Image src={role.icon} alt="" width={28} height={28} className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Role</span>
                <Badge tone={roleTone(role.name)}>{role.name}</Badge>
              </div>
              <p className="mt-1 line-clamp-3 text-sm leading-snug text-bone-2">{role.description}</p>
            </div>
          </Panel>
        )}
        <Panel className="flex items-center gap-8 px-5 py-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Abilities</span>
            <span className="font-mono text-2xl tabular-nums text-bone">{abilityCount}</span>
          </div>
          {releaseYear && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Since</span>
              <span className="font-mono text-2xl tabular-nums text-bone">{releaseYear}</span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
