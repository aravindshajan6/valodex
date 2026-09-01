"use client";

import { animate } from "animejs";
import { useRef } from "react";
import { useFavourites, useIsFavourite, type FavouriteKind } from "@/hooks/useFavourites";
import { cn } from "@/lib/cn";

type Props = {
  kind: FavouriteKind;
  id: string;
  /** Human name for the aria-label ("Add Vandal to favourites"). */
  name: string;
  /** `icon` is a square overlay for cards; `pill` adds a text label for detail-page headers. */
  variant?: "icon" | "pill";
  className?: string;
};

/**
 * ★ toggle backed by `useFavourites`. Never nest it inside a link — place it as a
 * sibling and position it over the card. Server HTML always renders the "off"
 * state; the real value arrives after hydration.
 */
export function FavouriteButton({ kind, id, name, variant = "icon", className }: Props) {
  const on = useIsFavourite(kind, id);
  const { toggle } = useFavourites();
  const star = useRef<SVGSVGElement>(null);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowOn = toggle(kind, id);
    const el = star.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(el, nowOn
      ? { scale: [1, 1.45, 1], rotate: [0, 72, 0], duration: 520, ease: "outBack(2.4)" }
      : { scale: [1, 0.7, 1], duration: 260, ease: "outQuad" });
  };

  const label = on ? `Remove ${name} from favourites` : `Add ${name} to favourites`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      data-favourite={on ? "on" : "off"}
      className={cn(
        "chamfer-sm inline-flex items-center justify-center gap-2 border font-mono text-[10px] uppercase tracking-[0.2em] outline-none backdrop-blur-sm transition-colors duration-200",
        "focus-visible:ring-1 focus-visible:ring-holo",
        on ? "border-gold/70 bg-gold/15 text-gold" : "border-line bg-ink/75 text-bone-2 hover:border-gold/60 hover:text-gold",
        variant === "icon" ? "h-8 w-8" : "h-9 px-3",
        className,
      )}
    >
      <svg ref={star} viewBox="0 0 24 24" width="14" height="14" aria-hidden className="shrink-0 will-change-transform">
        <path
          d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {variant === "pill" && <span>{on ? "Favourited" : "Favourite"}</span>}
    </button>
  );
}
