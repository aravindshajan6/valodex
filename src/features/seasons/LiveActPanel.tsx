import { Badge, Panel, Stat } from "@/components/ui";
import type { LiveAct } from "./build";

/** Hero-level readout of the act that is live right now. Numbers are computed at render (revalidated hourly). */
export function LiveActPanel({ live }: { live: LiveAct | null }) {
  if (!live) {
    return (
      <Panel className="p-5 sm:p-7">
        <div data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] text-mute">No act is live right now</div>
      </Panel>
    );
  }
  return (
    <Panel className="p-5 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div data-reveal className="mb-2 flex flex-wrap items-center gap-3">
            <Badge tone="red">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring bg-red" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-red" />
              </span>
              Live now
            </Badge>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-mute">{live.episode}</span>
          </div>
          <h2 data-reveal className="display text-5xl text-bone sm:text-6xl">
            {live.name}
          </h2>
          {live.title && (
            <div data-reveal className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-holo">
              {live.title}
            </div>
          )}
          <div data-reveal className="mt-3 font-mono text-xs tabular-nums text-bone-2">
            {live.startLabel} → {live.endLabel}
          </div>
        </div>
        <div data-reveal className="grid grid-cols-3 gap-6 sm:gap-10">
          <Stat label="Elapsed" value={live.elapsedPct} unit="%" />
          <Stat label="Days left" value={live.daysRemaining} />
          <Stat label="Of days" value={live.totalDays} />
        </div>
      </div>
      <div data-reveal className="mt-6">
        <div className="chamfer-sm h-3 w-full border border-line bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={live.elapsedPct} aria-label={`${live.name} progress`}>
          <div className="h-full bg-red" style={{ width: `${live.elapsedPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          <span>Day {live.daysElapsed}</span>
          <span>{live.daysRemaining} days remaining</span>
        </div>
      </div>
    </Panel>
  );
}
