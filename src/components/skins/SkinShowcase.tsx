"use client";

import { animate } from "animejs";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import SkinShowcaseScene from "./SkinShowcaseScene.lazy";
import { SPARKLE_TIERS, type TierInfo, oneLine } from "./tier";

export type ShowcaseChroma = { uuid: string; name: string; icon: string | null; fullRender: string | null; swatch: string | null };

/**
 * DOM shell around the 3D showcase: owns the active chroma, renders the swatch
 * picker (the accessible equivalent of the 3D stage) and a tier-coloured flash
 * on switch. A static render sits under the canvas as the no-JS / loading fallback.
 */
export function SkinShowcase({ skinName, chromas, fallbackIcon, tier }: { skinName: string; chromas: ShowcaseChroma[]; fallbackIcon: string | null; tier: TierInfo | null }) {
  const [active, setActive] = useState(0);
  const flash = useRef<HTMLDivElement>(null);
  const color = tier?.color ?? "#41e0c2";
  const chroma = chromas[active] ?? chromas[0];
  const url = chroma?.fullRender ?? chroma?.icon ?? fallbackIcon;
  const staticUrl = chroma?.icon ?? fallbackIcon ?? chroma?.fullRender;

  const pick = (i: number) => {
    if (i === active) return;
    setActive(i);
    if (flash.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animate(flash.current, { opacity: [0.28, 0], duration: 650, ease: "outExpo" });
    }
  };

  return (
    <div className="relative h-[62vh] max-h-[760px] min-h-[420px] overflow-hidden bg-ink">
      {staticUrl && (
        <div className="absolute left-1/2 top-[42%] h-[36%] w-[80%] max-w-3xl -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <Image src={staticUrl} alt="" fill sizes="(min-width: 1024px) 768px, 80vw" priority className="object-contain opacity-80" />
        </div>
      )}
      {url && <SkinShowcaseScene url={url} color={color} sparkle={Boolean(tier && SPARKLE_TIERS.has(tier.devName))} />}
      <div ref={flash} aria-hidden className="pointer-events-none absolute inset-0 opacity-0" style={{ background: color }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      <p className="sr-only">{skinName}{chroma ? `, ${oneLine(chroma.name)}` : ""}</p>

      {chromas.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 px-4">
          <div role="radiogroup" aria-label="Chroma" className="flex flex-wrap justify-center gap-2">
            {chromas.map((c, i) => {
              const on = i === active;
              return (
                <button
                  key={c.uuid}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={oneLine(c.name)}
                  onClick={() => pick(i)}
                  style={{ "--tier": color } as React.CSSProperties}
                  className={cn(
                    "chamfer-sm relative h-11 w-11 overflow-hidden border bg-ink-2 transition-[transform,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 focus:outline-none focus-visible:-translate-y-0.5",
                    on ? "border-(color:--tier) shadow-[0_0_24px_-4px_var(--tier)]" : "border-line hover:border-bone-2",
                  )}
                >
                  {c.swatch ? (
                    <Image src={c.swatch} alt="" fill sizes="44px" className="object-cover" />
                  ) : c.icon ? (
                    <Image src={c.icon} alt="" fill sizes="44px" className="object-contain p-1" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-[10px] text-mute">{i + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2" aria-live="polite">
            {chroma ? oneLine(chroma.name) : ""}
          </p>
        </div>
      )}
    </div>
  );
}
