import Image from "next/image";
import Link from "next/link";
import { FavouriteButton } from "@/components/ui/FavouriteButton";
import { cn } from "@/lib/cn";
import { CATEGORY_LABELS, formatCredits } from "./shop";
import type { WeaponSummary } from "./types";

/** Buy-menu style weapon tile: icon, name, category, price, and a ★ overlay. Server-safe. */
export function WeaponCard({ weapon, className, reveal = true }: { weapon: WeaponSummary; className?: string; reveal?: boolean }) {
  const slot = weapon.shopGridRow != null && weapon.shopGridColumn != null ? `R${weapon.shopGridRow}·C${weapon.shopGridColumn}` : null;
  return (
    <div
      data-reveal={reveal ? "" : undefined}
      className={cn(
        "group relative transition-[transform,filter] duration-300 ease-out-expo hover:-translate-y-1 hover:drop-shadow-[0_18px_28px_rgba(255,70,85,0.28)] focus-within:-translate-y-1 focus-within:drop-shadow-[0_18px_28px_rgba(65,224,194,0.25)]",
        className,
      )}
    >
      <Link
        href={`/weapons/${weapon.slug}`}
        aria-label={`${weapon.name}, ${weapon.cost === 0 ? "free" : `${formatCredits(weapon.cost)} credits`}`}
        className="chamfer relative flex flex-col border border-line bg-ink-3 outline-none transition-colors group-hover:border-red/60 focus-visible:border-holo"
      >
        <span aria-hidden className="bg-grid absolute inset-0 opacity-40" />
        {slot && (
          <span aria-hidden className="absolute left-3 top-2 font-mono text-[9px] tracking-[0.2em] text-mute">
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
      <FavouriteButton kind="weapons" id={weapon.uuid} name={weapon.name} className="absolute right-2 top-2 z-10" />
    </div>
  );
}
