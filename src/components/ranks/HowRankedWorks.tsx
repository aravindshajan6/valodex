import { Panel } from "@/components/ui";

const STEPS = [
  {
    k: "01",
    title: "Placement",
    body: "Five placement matches seed your first rank. When a new season resets ranks, placements settle you near where you left off.",
  },
  {
    k: "02",
    title: "Rank Rating",
    body: "Each tier holds 0–100 RR. Wins add RR, losses take it away; cross 100 to promote, fall below 0 to drop a tier. Round margin and performance nudge the amount.",
  },
  {
    k: "03",
    title: "Three steps per division",
    body: "Iron through Immortal are split into three numbered tiers. Radiant is a single tier at the very top.",
  },
  {
    k: "04",
    title: "Leaderboard",
    body: "From Immortal upward you compete on your region's leaderboard. Radiant is reserved for the top 500 in each region.",
  },
] as const;

/** Evergreen ranked rules — nothing here changes per act. */
export function HowRankedWorks() {
  return (
    <Panel className="p-5 sm:p-7">
      <div data-reveal className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
        <span className="h-px w-8 bg-red" />
        How ranked works
      </div>
      <ol className="grid gap-5 sm:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.k} data-reveal className="flex gap-4">
            <span className="font-mono text-xs text-holo">{s.k}</span>
            <div>
              <h3 className="display text-2xl text-bone">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-bone-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
