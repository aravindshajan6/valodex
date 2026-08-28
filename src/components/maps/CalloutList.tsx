"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { SUPER_REGION_ORDER, superRegionColor, type ProjectedCallout } from "@/lib/minimap";

export type CalloutListProps = {
  callouts: ProjectedCallout[];
  hoveredId?: number | null;
  selectedId?: number | null;
  onHover?: (id: number | null) => void;
  onSelect?: (id: number | null) => void;
  className?: string;
};

/** Group callouts by super region, in canonical order, appending unknown regions at the end. */
export function groupCallouts(callouts: ProjectedCallout[]) {
  const order = [...SUPER_REGION_ORDER, ...Array.from(new Set(callouts.map((c) => c.superRegion))).filter((s) => !(SUPER_REGION_ORDER as readonly string[]).includes(s))];
  return order
    .map((key) => {
      const items = callouts.filter((c) => c.superRegion === key);
      return { key, label: items[0]?.superRegionName || key, color: superRegionColor(key), items };
    })
    .filter((g) => g.items.length);
}

/** DOM sidebar for the tactical map: the accessible twin of the 3D pins. */
export function CalloutList({ callouts, hoveredId = null, selectedId = null, onHover, onSelect, className }: CalloutListProps) {
  const groups = groupCallouts(callouts);
  const rootRef = useRef<HTMLDivElement>(null);
  const interactive = Boolean(onSelect || onHover);

  useEffect(() => {
    if (selectedId === null) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-callout="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div ref={rootRef} className={cn("chamfer border border-line bg-ink-2", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red">Callouts</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{callouts.length} positions</span>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-2 lg:max-h-[640px]" onMouseLeave={() => onHover?.(null)}>
        {groups.map((g) => (
          <section key={g.key} className="mb-2 last:mb-0">
            <h3 className="flex items-center gap-2 px-2 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2">
              <span className="inline-block h-2 w-2" style={{ backgroundColor: g.color, boxShadow: `0 0 8px ${g.color}` }} aria-hidden />
              {g.label}
              <span className="text-mute">{g.items.length}</span>
            </h3>
            <ul>
              {g.items.map((c) => {
                const selected = c.id === selectedId;
                const hovered = c.id === hoveredId;
                const content = (
                  <>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-mute">z {Math.round(c.z)}</span>
                  </>
                );
                const cls = cn(
                  "flex w-full items-center gap-3 border-l-2 px-3 py-1.5 text-left text-sm transition-colors",
                  selected ? "border-current bg-ink-3 text-bone" : hovered ? "bg-ink-3 text-bone" : "text-bone-2",
                  interactive && "hover:bg-ink-3 hover:text-bone outline-none focus-visible:bg-ink-3 focus-visible:text-bone",
                  !selected && "border-transparent",
                );
                return (
                  <li key={c.id}>
                    {interactive ? (
                      <button
                        type="button"
                        data-callout={c.id}
                        aria-pressed={selected}
                        className={cls}
                        style={{ color: selected || hovered ? g.color : undefined }}
                        onMouseEnter={() => onHover?.(c.id)}
                        onFocus={() => onHover?.(c.id)}
                        onBlur={() => onHover?.(null)}
                        onClick={() => onSelect?.(selected ? null : c.id)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div data-callout={c.id} className={cls}>
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
