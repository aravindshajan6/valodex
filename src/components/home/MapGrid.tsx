import Image from "next/image";
import Link from "next/link";

export type TeaserMap = {
  slug: string;
  name: string;
  splash: string;
  minimap: string | null;
  sites: string;
  coordinates: string;
  callouts: number;
};

/** Map splash cards; hovering reveals the minimap over the splash. Server markup, CSS motion. */
export function MapGrid({ maps }: { maps: TeaserMap[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {maps.map((m) => (
        <Link
          key={m.slug}
          href={`/maps/${m.slug}`}
          data-reveal
          className="chamfer group relative block aspect-[16/10] overflow-hidden border border-line bg-ink-3 focus-visible:border-holo focus-visible:outline-none"
        >
          <Image
            src={m.splash}
            alt={`${m.name} splash art`}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-[transform,filter,opacity] duration-700 ease-out-expo group-hover:scale-105 group-hover:opacity-40 group-hover:grayscale group-hover:brightness-50"
          />
          {m.minimap && (
            <div className="absolute inset-0 flex items-center justify-center p-6 opacity-0 transition-[opacity,transform] duration-700 ease-out-expo scale-95 group-hover:scale-100 group-hover:opacity-100">
              <Image
                src={m.minimap}
                alt={`${m.name} minimap`}
                fill
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                className="object-contain p-6 mix-blend-screen drop-shadow-[0_0_24px_rgba(65,224,194,0.35)]"
              />
            </div>
          )}
          {/* corner brackets */}
          <span aria-hidden className="absolute left-3 top-3 h-4 w-4 border-l border-t border-holo/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span aria-hidden className="absolute right-3 top-3 h-4 w-4 border-r border-t border-holo/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span aria-hidden className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-holo/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span aria-hidden className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-holo/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/80">
            <span>{m.sites}</span>
            <span className="text-holo">{m.callouts} callouts</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-4 pb-3 pt-12">
            <div className="display text-3xl text-bone">{m.name}</div>
            {m.coordinates && <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{m.coordinates}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}
