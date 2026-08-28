import Image from "next/image";
import { Badge, Panel } from "@/components/ui";

export type EpisodeStripSet = {
  label: string;
  current: boolean;
  /** The top tier of each division present in this set (e.g. Diamond 3), keyed by division. */
  icons: Record<string, { name: string; smallIcon: string | null } | undefined>;
};

/** How every division's badge art changed across the five tier sets. Columns come from the live ladder. */
export function EpisodeStrip({ sets, divisions }: { sets: EpisodeStripSet[]; divisions: Array<{ division: string; name: string; color: string }> }) {
  return (
    <Panel className="p-5 sm:p-7">
      <div data-reveal className="mb-1 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
        <span className="h-px w-8 bg-red" />
        Across episodes
      </div>
      <p data-reveal className="mb-5 text-sm text-bone-2">
        The top tier of each division, per tier set. Ascendant only appears in the newest ladder.
      </p>
      <div data-reveal className="-mx-5 overflow-x-auto px-5 sm:-mx-7 sm:px-7">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-left">
          <thead>
            <tr>
              <th scope="col" className="pr-3 font-mono text-[10px] font-normal uppercase tracking-[0.25em] text-mute">Set</th>
              {divisions.map((d) => (
                <th key={d.division} scope="col" className="px-1 text-center font-mono text-[10px] font-normal uppercase tracking-[0.2em]" style={{ color: d.color }}>
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.label} className={set.current ? "bg-ink-2/70" : undefined}>
                <th scope="row" className="whitespace-nowrap py-1 pr-3 font-mono text-[11px] font-normal text-bone">
                  <span className="flex items-center gap-2">
                    {set.label}
                    {set.current && <Badge tone="red">Live</Badge>}
                  </span>
                </th>
                {divisions.map((d) => {
                  const icon = set.icons[d.division];
                  return (
                    <td key={d.division} className="px-1 py-1 text-center">
                      {icon?.smallIcon ? (
                        <Image src={icon.smallIcon} alt={`${icon.name} — ${set.label}`} width={44} height={44} sizes="44px" className="mx-auto h-11 w-11 object-contain" />
                      ) : (
                        <span className="mx-auto block h-11 w-11 font-mono text-[10px] leading-[2.75rem] text-mute" aria-label={`${d.name} not in ${set.label}`}>
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
