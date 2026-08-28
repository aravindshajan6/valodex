import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type BundleCardData = {
  uuid: string;
  slug: string;
  name: string;
  sub: string;
  logo: string | null;
  vertical: string | null;
  icon: string | null;
  counts: { skins: number; cards: number; sprays: number; buddies: number };
  total: number;
};

export function countsLabel(c: BundleCardData["counts"]): string {
  const parts: string[] = [];
  if (c.skins) parts.push(`${c.skins} skin${c.skins === 1 ? "" : "s"}`);
  if (c.cards) parts.push(`${c.cards} card${c.cards === 1 ? "" : "s"}`);
  if (c.sprays) parts.push(`${c.sprays} spray${c.sprays === 1 ? "" : "s"}`);
  if (c.buddies) parts.push(`${c.buddies} budd${c.buddies === 1 ? "y" : "ies"}`);
  return parts.join(" · ");
}

/** Tall poster card built on the bundle's verticalPromoImage. */
export function BundleCard({ bundle, index, priority = false, className }: { bundle: BundleCardData; index?: number; priority?: boolean; className?: string }) {
  const image = bundle.vertical ?? bundle.icon;
  const counts = countsLabel(bundle.counts);
  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      data-i={index}
      className={cn(
        "group block outline-none transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(255,70,85,0.45)] focus-visible:-translate-y-1 focus-visible:shadow-[0_30px_70px_-30px_rgba(255,70,85,0.45)]",
        className,
      )}
    >
      <div className="chamfer relative aspect-[3/4] overflow-hidden border border-line bg-ink-3 transition-colors duration-300 group-hover:border-red/70 group-focus-visible:border-red/70">
        {image ? (
          <Image
            src={image}
            alt={bundle.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            loading={priority ? undefined : "lazy"}
            priority={priority}
            className={cn("object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]", bundle.vertical ? "object-top" : "object-center")}
          />
        ) : (
          <div className="absolute inset-0 bg-grid" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red to-transparent opacity-70" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {bundle.logo ? (
            <div className="relative mb-2 h-10 w-full sm:h-12">
              <Image src={bundle.logo} alt="" fill sizes="240px" loading="lazy" className="object-contain object-left drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]" />
              <span className="sr-only">{bundle.name}</span>
            </div>
          ) : (
            <p className="display text-2xl leading-none text-bone sm:text-3xl">{bundle.name}</p>
          )}
          {bundle.sub && <p className="mt-1 truncate text-xs text-bone-2">{bundle.sub}</p>}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{counts || "Contents unknown"}</p>
        </div>
      </div>
    </Link>
  );
}
