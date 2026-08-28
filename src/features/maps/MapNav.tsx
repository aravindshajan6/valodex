import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Localized } from "@/lib/i18n";

type Neighbor = { slug: string; displayName: Localized; listViewIcon: string | null; splash: string | null } | null;

function NavLink({ map, dir }: { map: Neighbor; dir: "prev" | "next" }) {
  if (!map) return <div />;
  const name = t(map.displayName);
  const img = map.listViewIcon ?? map.splash;
  const next = dir === "next";
  return (
    <Link
      href={`/maps/${map.slug}`}
      className={`group chamfer flex items-center gap-4 border border-line bg-ink-2 p-3 transition-colors hover:border-red/60 outline-none focus-visible:border-holo ${next ? "flex-row-reverse text-right" : ""}`}
    >
      <div className="relative h-14 w-24 shrink-0 overflow-hidden bg-ink-3">
        {img && <Image src={img} alt="" fill sizes="96px" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-mute">{next ? "Next map →" : "← Previous map"}</div>
        <div className="display truncate text-2xl text-bone">{name}</div>
      </div>
    </Link>
  );
}

/** Previous / next map footer navigation. */
export function MapNav({ prev, next }: { prev: Neighbor; next: Neighbor }) {
  return (
    <nav aria-label="Map navigation" className="grid gap-4 sm:grid-cols-2">
      <NavLink map={prev} dir="prev" />
      <NavLink map={next} dir="next" />
    </nav>
  );
}
