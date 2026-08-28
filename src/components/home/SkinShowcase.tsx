"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui";

export type ShowcaseSkin = {
  uuid: string;
  name: string;
  weapon: string;
  weaponSlug: string;
  tier: string;
  tierColor: string;
  icon: string;
  video: string | null;
};

/** Row of high-tier skins; hovering (or focusing) a card streams its level video, muted and looping. */
export function SkinShowcase({ skins }: { skins: ShowcaseSkin[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {skins.map((s) => (
        <SkinCard key={s.uuid} skin={s} />
      ))}
    </div>
  );
}

function SkinCard({ skin }: { skin: ShowcaseSkin }) {
  const video = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    if (!skin.video) return;
    setArmed(true);
    const v = video.current;
    if (!v) return;
    if (!v.src) v.src = skin.video;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = () => {
    const v = video.current;
    if (v) v.pause();
    setPlaying(false);
  };

  return (
    <Link
      href="/skins"
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      data-reveal
      className="chamfer group relative block aspect-[16/10] overflow-hidden border border-line bg-ink-3 transition-[border-color,transform] duration-300 ease-out-expo hover:-translate-y-1 hover:border-red/60 focus-visible:border-holo focus-visible:outline-none"
      style={{ background: `radial-gradient(120% 80% at 50% 110%, ${skin.tierColor}33 0%, #1b2836 60%)` }}
    >
      {/* skin render */}
      {/* eslint-disable-next-line @next/next/no-img-element -- doubles as the video poster; sits under a video element */}
      <img
        src={skin.icon}
        alt={skin.name}
        loading="lazy"
        decoding="async"
        className={`absolute inset-x-6 top-1/2 h-auto w-[calc(100%-3rem)] -translate-y-[60%] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)] transition-[opacity,transform] duration-500 ease-out-expo group-hover:-translate-y-[64%] group-hover:scale-[1.04] ${playing ? "opacity-0" : "opacity-100"}`}
      />

      {/* streamed level video */}
      {armed && skin.video && (
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* scanline sheen */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_3px,rgba(15,25,35,0.35)_3px_4px)] opacity-0 transition-opacity duration-500 group-hover:opacity-60" />

      {/* meta */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink via-ink/85 to-transparent px-4 pb-3 pt-10">
        <div className="min-w-0">
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.25em] text-mute">{skin.weapon}</div>
          <div className="display truncate text-xl text-bone sm:text-2xl">{skin.name}</div>
        </div>
        <Badge tone={skin.tier === "Ultra" ? "gold" : "red"} className="shrink-0">
          {skin.tier}
        </Badge>
      </div>

      {skin.video && (
        <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-holo/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {playing ? "● live" : "hover"}
        </span>
      )}
    </Link>
  );
}
