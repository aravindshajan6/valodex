import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { TierInfo } from "./tier";

export type SkinCardData = {
  uuid: string;
  name: string;
  href: string;
  icon: string | null;
  weaponName: string;
  tier: TierInfo | null;
  hasVideo?: boolean;
};

/** Dark chamfered skin card with a tier hairline + icon. Works in server and client trees. */
export function SkinCard({ skin, className, index, priority = false }: { skin: SkinCardData; className?: string; index?: number; priority?: boolean }) {
  const color = skin.tier?.color ?? "#41e0c2";
  return (
    <Link
      href={skin.href}
      data-i={index}
      style={{ "--tier": color } as CSSProperties}
      className={cn(
        "group block outline-none transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 focus-visible:-translate-y-1",
        "hover:shadow-[0_24px_60px_-24px_var(--tier)] focus-visible:shadow-[0_24px_60px_-24px_var(--tier)]",
        className,
      )}
    >
      <div className="chamfer relative border border-line bg-ink-3 transition-colors duration-300 group-hover:border-(color:--tier) group-focus-visible:border-(color:--tier)">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent 70%)` }} />
        <div className="relative aspect-[16/9] w-full">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_65%)]" />
          {skin.icon ? (
            <Image
              src={skin.icon}
              alt={skin.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              loading={priority ? undefined : "lazy"}
              priority={priority}
              className="object-contain p-5 transition-transform duration-500 ease-out-expo group-hover:scale-[1.06]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-mute">No render</div>
          )}
          {skin.hasVideo && (
            <span className="absolute right-3 top-3 border border-holo/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-holo">Video</span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-line/70 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-bone">{skin.name}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{skin.weaponName}</p>
          </div>
          {skin.tier?.icon && <Image src={skin.tier.icon} alt={skin.tier.name} width={22} height={22} loading="lazy" className="shrink-0 opacity-90" />}
        </div>
      </div>
    </Link>
  );
}
