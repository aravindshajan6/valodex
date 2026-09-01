"use client";

import Link from "next/link";
import { useFavourites } from "@/hooks/useFavourites";
import { cn } from "@/lib/cn";

/** Nav ★ with a live count. The count renders only after hydration so server HTML matches. */
export function FavouritesNavLink({ active, mobile = false, onClick }: { active: boolean; mobile?: boolean; onClick?: () => void }) {
  const { count, hydrated } = useFavourites();
  const showCount = hydrated && count > 0;

  return (
    <Link
      href="/favourites"
      onClick={onClick}
      aria-label={showCount ? `Favourites, ${count} saved` : "Favourites"}
      className={cn(
        "group inline-flex items-center gap-2 font-semibold uppercase tracking-[0.18em] transition-colors",
        mobile ? "py-3 text-sm text-bone-2 hover:text-bone" : "relative ml-2 h-9 px-3 text-xs",
        !mobile && (active ? "text-gold" : "text-bone-2 hover:text-gold"),
      )}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden className="shrink-0">
        <path
          d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z"
          fill={showCount ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {mobile && <span>Favourites</span>}
      {showCount && (
        <span className="chamfer-sm min-w-5 bg-gold px-1.5 py-0.5 text-center font-mono text-[10px] leading-none tabular-nums text-ink">{count}</span>
      )}
      {!mobile && (
        <span className={cn("absolute inset-x-3 -bottom-px h-px origin-left bg-gold transition-transform duration-300", active ? "scale-x-100" : "scale-x-0")} />
      )}
    </Link>
  );
}
