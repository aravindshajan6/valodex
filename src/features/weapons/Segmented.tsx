"use client";

import { cn } from "@/lib/cn";

/** Chamfered segmented control — the standard toggle for tool UI. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string; hint?: string; swatch?: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("chamfer-sm inline-flex flex-wrap border border-line bg-ink-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo",
              active ? "bg-red text-bone" : "text-bone-2 hover:text-bone",
            )}
          >
            {o.swatch && <span aria-hidden className="h-2 w-2" style={{ background: o.swatch }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
