import { cn } from "@/lib/cn";

/** Label + big mono number. `data-count` lets <RevealGroup> animate the number up from 0. */
export function Stat({ label, value, unit, className }: { label: string; value: number | string; unit?: string; className?: string }) {
  const numeric = typeof value === "number";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">{label}</span>
      <span className="font-mono text-2xl text-bone tabular-nums">
        <span data-count={numeric ? value : undefined}>{value}</span>
        {unit && <span className="ml-1 text-sm text-bone-2">{unit}</span>}
      </span>
    </div>
  );
}
