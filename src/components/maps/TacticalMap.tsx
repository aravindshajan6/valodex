"use client";

import { useState } from "react";
import { SUPER_REGION_ORDER, superRegionColor, type ProjectedCallout } from "@/lib/minimap";
import { CalloutList } from "./CalloutList";
import { Minimap2D } from "./Minimap2D";
import TacticalMapScene from "./TacticalMapScene.lazy";
import { useMediaQuery, useWebGL } from "./useMedia";

type Mode = "3d" | "2d";

/**
 * The map page centrepiece: 3D tactical map (desktop + WebGL) or flat minimap
 * with DOM markers (mobile / no WebGL / SSR), plus the callout sidebar. Hover
 * and selection are shared between all three so each view mirrors the others.
 */
export function TacticalMap({ icon, mapName, callouts }: { icon: string; mapName: string; callouts: ProjectedCallout[] }) {
  const [hoveredId, setHovered] = useState<number | null>(null);
  const [selectedId, setSelected] = useState<number | null>(null);
  const [override, setOverride] = useState<Mode | null>(null);
  const mobile = useMediaQuery("(max-width: 767px)");
  const webgl = useWebGL();
  const mode: Mode = override ?? (webgl && !mobile ? "3d" : "2d");

  const legend = SUPER_REGION_ORDER.filter((s) => callouts.some((c) => c.superRegion === s)).map((s) => ({
    key: s,
    label: callouts.find((c) => c.superRegion === s)?.superRegionName ?? s,
    color: superRegionColor(s),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
            {legend.map((l) => (
              <li key={l.key} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-2">
                <span className="inline-block h-2 w-2" style={{ backgroundColor: l.color, boxShadow: `0 0 8px ${l.color}` }} aria-hidden />
                {l.label}
              </li>
            ))}
          </ul>
          <div role="group" aria-label="View mode" className="flex">
            {(["3d", "2d"] as Mode[]).map((m) => {
              const active = mode === m;
              const disabled = m === "3d" && !webgl;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  title={disabled ? "WebGL unavailable" : undefined}
                  onClick={() => setOverride(m)}
                  className={`chamfer-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors outline-none focus-visible:border-holo disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? "border-red bg-red/10 text-bone" : "border-line text-bone-2 hover:text-bone"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <div className="chamfer relative aspect-square overflow-hidden border border-line bg-ink-2 sm:aspect-[4/3]">
          {mode === "3d" ? (
            <TacticalMapScene icon={icon} callouts={callouts} hoveredId={hoveredId} selectedId={selectedId} onHover={setHovered} onSelect={setSelected} />
          ) : (
            <Minimap2D icon={icon} mapName={mapName} callouts={callouts} hoveredId={hoveredId} selectedId={selectedId} onHover={setHovered} onSelect={setSelected} />
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
            {mode === "3d" ? "drag to orbit · scroll to zoom · click a pin" : "tap a marker"}
          </div>
        </div>
      </div>
      <CalloutList callouts={callouts} hoveredId={hoveredId} selectedId={selectedId} onHover={setHovered} onSelect={setSelected} className="lg:self-start" />
    </div>
  );
}
