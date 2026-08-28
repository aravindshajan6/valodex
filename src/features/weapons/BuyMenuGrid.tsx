import Image from "next/image";
import Link from "next/link";
import { RevealGroup } from "@/components/motion";
import { CATEGORY_LABELS, formatCredits, groupForBuyMenu } from "./shop";
import type { WeaponSummary } from "./types";

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

function WeaponCard({ weapon }: { weapon: WeaponSummary }) {
  const slot = weapon.shopGridRow != null && weapon.shopGridColumn != null ? `R${weapon.shopGridRow}·C${weapon.shopGridColumn}` : null;
  return (
    <div
      data-reveal
      className="group transition-[transform,filter] duration-300 ease-out-expo hover:-translate-y-1 hover:drop-shadow-[0_18px_28px_rgba(255,70,85,0.28)] focus-within:-translate-y-1 focus-within:drop-shadow-[0_18px_28px_rgba(65,224,194,0.25)]"
    >
      <Link
        href={`/weapons/${weapon.slug}`}
        aria-label={`${weapon.name}, ${weapon.cost === 0 ? "free" : `${formatCredits(weapon.cost)} credits`}`}
        className="chamfer relative flex flex-col border border-line bg-ink-3 outline-none transition-colors group-hover:border-red/60 focus-visible:border-holo"
      >
        <span aria-hidden className="bg-grid absolute inset-0 opacity-40" />
        {slot && (
          <span aria-hidden className="absolute right-3 top-2 font-mono text-[9px] tracking-[0.2em] text-mute">
            {slot}
          </span>
        )}
        <span className="relative block aspect-[2/1] w-full px-6 pt-7">
          {weapon.displayIcon && (
            <Image
              src={weapon.displayIcon}
              alt=""
              fill
              sizes="(min-width: 1280px) 15vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-contain p-4 drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out-expo group-hover:scale-105"
            />
          )}
        </span>
        <span className="relative flex items-end justify-between gap-3 px-4 pb-4 pt-1">
          <span className="min-w-0">
            <span className="display block text-2xl text-bone">{weapon.name}</span>
            <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
              {CATEGORY_LABELS[weapon.category] ?? weapon.category} · {weapon.skinCount} skins
            </span>
          </span>
          <span className="shrink-0 font-mono text-sm tabular-nums text-bone-2">
            <span aria-hidden className="mr-1 text-holo">◈</span>
            {formatCredits(weapon.cost)}
          </span>
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>
    </div>
  );
}
