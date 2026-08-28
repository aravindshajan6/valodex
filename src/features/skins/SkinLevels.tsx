"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { humanize } from "./tier";

export type ShowcaseLevel = { uuid: string; name: string; levelItem: string | null; icon: string | null; video: string | null };

/** Horizontal strip of level cards; each video plays on hover / focus / tap and rewinds on leave. */
export function SkinLevels({ levels, color }: { levels: ShowcaseLevel[]; color: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" style={{ scrollbarGutter: "stable" }}>
      <ol className="flex snap-x snap-mandatory gap-4">
        {levels.map((lv, i) => (
          <li key={lv.uuid} className="snap-start">
            <LevelCard level={lv} index={i} color={color} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function LevelCard({ level, index, color }: { level: ShowcaseLevel; index: number; color: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = video.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = () => {
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  };
  const toggle = () => (playing ? stop() : play());

  return (
    <article className="chamfer w-[280px] border border-line bg-ink-3 sm:w-[360px]" style={{ "--tier": color } as React.CSSProperties}>
      <div className="relative aspect-video bg-ink">
        {level.video ? (
          <button
            type="button"
            onMouseEnter={play}
            onMouseLeave={stop}
            onFocus={play}
            onBlur={stop}
            onClick={toggle}
            aria-pressed={playing}
            aria-label={`${playing ? "Pause" : "Play"} preview: ${level.name}`}
            className="group block h-full w-full focus:outline-none"
          >
            <video ref={video} muted loop playsInline preload="none" poster={level.icon ?? undefined} className="h-full w-full object-cover">
              <source src={level.video} type="video/mp4" />
            </video>
            <span
              className={cn(
                "absolute bottom-2 right-2 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] transition-colors",
                playing ? "border-(color:--tier) text-(color:--tier)" : "border-line/80 bg-ink/70 text-bone-2 group-hover:text-bone",
              )}
            >
              {playing ? "Playing" : "Hover to play"}
            </span>
            <span aria-hidden className={cn("absolute inset-0 ring-1 ring-inset transition-opacity", playing ? "opacity-100 ring-(color:--tier)" : "opacity-0")} />
          </button>
        ) : level.icon ? (
          <Image src={level.icon} alt={level.name} fill sizes="360px" loading="lazy" className="object-contain p-6" />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-mute">No preview</div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-line/70 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Level {index + 1}</p>
          <p className="mt-1 truncate text-sm font-semibold text-bone">{level.name}</p>
        </div>
        <Badge tone={level.levelItem ? "holo" : "neutral"}>{level.levelItem ? humanize(level.levelItem) : "Base"}</Badge>
      </div>
    </article>
  );
}
