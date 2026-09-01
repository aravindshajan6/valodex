import Image from "next/image";
import Link from "next/link";
import { RevealGroup } from "@/components/motion";
import { groupForBuyMenu } from "./shop";
import type { WeaponSummary } from "./types";
import { WeaponCard } from "./WeaponCard";

/**
 * The in-game buy menu: one column per shop category (Sidearms, SMGs, Shotguns,
 * Rifles, Sniper Rifles, Heavy), weapons stacked by price inside each column.
 */
export function BuyMenuGrid({ weapons }: { weapons: WeaponSummary[] }) {
  const { columns, melee } = groupForBuyMenu(weapons);
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {columns.map((col, i) => (
          <RevealGroup key={col.key} as="section" className="flex flex-col gap-3">
            <header data-reveal className="flex items-baseline justify-between border-b border-line pb-2">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-red">{col.label}</h2>
              <span className="font-mono text-[10px] tabular-nums text-mute">{String(i + 1).padStart(2, "0")}</span>
            </header>
            {col.weapons.map((w) => (
              <WeaponCard key={w.slug} weapon={w} />
            ))}
          </RevealGroup>
        ))}
      </div>
      {melee && (
        <RevealGroup className="mt-6">
          <Link
            href={`/weapons/${melee.slug}`}
            data-reveal
            className="chamfer group flex items-center gap-6 border border-line bg-ink-2 px-6 py-4 outline-none transition-colors hover:border-red/60 focus-visible:border-holo"
          >
            {melee.displayIcon && (
              <span className="relative h-10 w-32 shrink-0">
                <Image src={melee.displayIcon} alt="" fill sizes="128px" className="object-contain" />
              </span>
            )}
            <span className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="display text-2xl text-bone">{melee.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Always equipped · {melee.skinCount} skins</span>
            </span>
            <span className="font-mono text-sm text-bone-2 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </RevealGroup>
      )}
    </div>
  );
}
