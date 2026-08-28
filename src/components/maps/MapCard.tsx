import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";

export type MapCardData = {
  slug: string;
  name: string;
  tactical: string;
  coordinates: string;
  splash: string | null;
  displayIcon: string | null;
  calloutCount: number;
};

/** Wide chamfered splash card; the minimap fades in with a slow zoom on hover. */
export function MapCard({ map, priority = false }: { map: MapCardData; priority?: boolean }) {
  return (
    <Link
      href={`/maps/${map.slug}`}
      data-card
      className="group chamfer relative block aspect-[16/9] overflow-hidden border border-line bg-ink-3 outline-none transition-[border-color] duration-300 hover:border-red/60 focus-visible:border-holo"
      aria-label={`${map.name} — ${map.tactical || "map"}, ${map.calloutCount} callouts`}
    >
      {map.splash && (
        <Image
          src={map.splash}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      )}
      {map.displayIcon && (
        <div className="absolute inset-0 bg-ink/85 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
          <Image
            src={map.displayIcon}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain p-8 scale-95 transition-transform duration-[2400ms] ease-out-expo group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none"
          />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-holo/90">{map.coordinates || "COORDINATES CLASSIFIED"}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">/{map.slug}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="display text-4xl sm:text-5xl lg:text-6xl text-bone drop-shadow-[0_2px_12px_rgba(15,25,35,0.8)]">{map.name}</h2>
        <div className="flex flex-wrap gap-2">
          {map.tactical && <Badge tone="red">{map.tactical}</Badge>}
          <Badge tone={map.calloutCount ? "holo" : "neutral"}>{map.calloutCount ? `${map.calloutCount} callouts` : "no callouts"}</Badge>
        </div>
      </div>
    </Link>
  );
}
