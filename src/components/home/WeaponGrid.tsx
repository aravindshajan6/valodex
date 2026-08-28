import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";

export type TeaserWeapon = {
  slug: string;
  name: string;
  category: string;
  cost: number | null;
  icon: string | null;
  fireRate: number | null;
  magazine: number | null;
};

/** Six marquee weapons in a chamfered grid. Server markup; hover motion is CSS only. */
export function WeaponGrid({ weapons }: { weapons: TeaserWeapon[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {weapons.map((w, i) => (
        <Link
          key={w.slug}
          href={`/weapons/${w.slug}`}
          data-reveal
          className="chamfer group relative block overflow-hidden border border-line bg-ink-3 p-5 transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:border-red/60 hover:shadow-[0_20px_60px_-20px_rgba(255,70,85,0.35)] focus-visible:border-holo focus-visible:outline-none"
        >
          <div className="bg-grid absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-60" aria-hidden />
          <div className="relative flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <Badge tone="neutral" className="group-hover:border-holo/60 group-hover:text-holo">
              {w.category}
            </Badge>
          </div>
          <div className="relative my-4 flex h-24 items-center justify-center sm:h-28">
            {w.icon && (
              <Image
                src={w.icon}
                alt={w.name}
                width={360}
                height={120}
                sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
                className="h-auto w-[86%] max-w-[320px] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:scale-[1.06] group-hover:-rotate-2"
              />
            )}
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <div className="display text-3xl text-bone">{w.name}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
                {w.fireRate != null && <span>{w.fireRate.toFixed(2)} rps</span>}
                {w.fireRate != null && w.magazine != null && <span className="mx-2 text-line">|</span>}
                {w.magazine != null && <span>{w.magazine} mag</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">creds</div>
              <div className="font-mono text-xl text-holo tabular-nums">{w.cost != null ? w.cost.toLocaleString("en-US") : "—"}</div>
            </div>
          </div>
          <span aria-hidden className="absolute bottom-0 left-0 h-[2px] w-0 bg-red transition-[width] duration-500 ease-out-expo group-hover:w-full" />
        </Link>
      ))}
    </div>
  );
}
