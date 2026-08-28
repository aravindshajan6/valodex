"use client";

import Image from "next/image";
import { superRegionColor, type ProjectedCallout } from "@/lib/minimap";

type Props = {
  icon: string;
  mapName: string;
  callouts: ProjectedCallout[];
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
};

/** Flat minimap with DOM markers at the same UVs as the 3D pins — the no-WebGL / mobile view. */
export function Minimap2D({ icon, mapName, callouts, hoveredId, selectedId, onHover, onSelect }: Props) {
  return (
    <div className="bg-grid absolute inset-0 flex items-center justify-center p-3 sm:p-5">
      <div className="relative aspect-square h-full max-w-full">
        <Image src={icon} alt={`${mapName} minimap`} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-contain opacity-90" />
        {callouts.map((c) => {
          const color = superRegionColor(c.superRegion);
          const active = c.id === hoveredId || c.id === selectedId;
          const selected = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              aria-label={`${c.superRegionName} ${c.name}`}
              aria-pressed={selected}
              style={{ left: `${c.u * 100}%`, top: `${c.v * 100}%`, color }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
              onMouseEnter={() => onHover(c.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(c.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(selected ? null : c.id)}
            >
              <span className="relative block h-5 w-5">
                {selected && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-current" aria-hidden />}
                <span
                  className={`absolute inset-0 m-auto block rounded-full border border-ink transition-transform ${active ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`}
                  style={{ backgroundColor: color, boxShadow: `0 0 ${active ? 14 : 6}px ${color}` }}
                />
              </span>
              <span
                className={`chamfer-sm pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap border bg-ink/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity ${
                  active ? "opacity-100" : "opacity-0 group-focus-visible:opacity-100"
                }`}
                style={{ borderColor: color }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
