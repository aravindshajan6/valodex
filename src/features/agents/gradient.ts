/**
 * Agent gradient helpers. valorant-api ships `backgroundGradientColors` as four
 * RGBA hex strings without `#` (e.g. "371c5cff"). Index 1 is always the page ink
 * and index 3 is usually a transparent ink, so the useful colour information is
 * stops 0 and 2 — with a couple of agents shipping pure white as stop 2.
 *
 * The hex maths lives in `@/lib/color`; this module is only the agent-specific part.
 */

import { darken, INK, isUsableStop, lighten, rgbaHex, rgbaHexToCss, withAlpha } from "@/lib/color";

export { INK, lighten, darken, withAlpha, rgbaHexToCss };
/** `"371c5cff"` -> `"#371c5c"`. Wrapped so it can be passed straight to `.map()`. */
export const rgbaHexToHex = (hex: string): string => rgbaHex(hex);

const isUsable = isUsableStop;

export type AgentPalette = {
  /** Dominant agent colour (stop 0). */
  primary: string;
  /** Secondary colour (stop 2, or a lightened primary when the API ships white/ink). */
  accent: string;
  /** A bright, bloom-friendly version of the accent for holo rims and glows. */
  glow: string;
  /** All four stops as CSS colours, in API order. */
  stops: string[];
};

const FALLBACK_PRIMARY = "#25607a";

/** Sanitised palette derived from the raw API gradient list. Never throws on null/short input. */
export function agentPalette(colors: string[] | null | undefined): AgentPalette {
  const raw = colors ?? [];
  const usable = raw.filter(isUsable).map(rgbaHexToHex);
  const primary = usable[0] ?? FALLBACK_PRIMARY;
  const accent = usable[1] ?? lighten(primary, 0.35);
  return {
    primary,
    accent,
    glow: lighten(accent, 0.45),
    stops: raw.length ? raw.map((c) => rgbaHexToCss(c)) : [primary, INK, accent, "rgba(15, 25, 35, 0)"],
  };
}

/** Card surface: agent colour at the top falling into ink, with the accent bleeding back in at the foot. */
export function cardGradient(p: AgentPalette): string {
  return [
    `radial-gradient(120% 70% at 50% -10%, ${withAlpha(p.accent, 0.55)} 0%, transparent 60%)`,
    `linear-gradient(178deg, ${p.primary} 0%, ${darken(p.primary, 0.55)} 38%, ${INK} 72%, ${darken(p.accent, 0.6)} 100%)`,
  ].join(", ");
}

/** Full-bleed page hero: a soft primary glow top-right and an accent glow bottom-left over ink. */
export function heroGradient(p: AgentPalette): string {
  return [
    `radial-gradient(60% 55% at 78% 22%, ${withAlpha(p.primary, 0.75)} 0%, transparent 70%)`,
    `radial-gradient(45% 40% at 12% 90%, ${withAlpha(p.accent, 0.35)} 0%, transparent 70%)`,
    `linear-gradient(180deg, ${darken(p.primary, 0.7)} 0%, ${INK} 60%)`,
  ].join(", ");
}

/** Straight conversion of the API list into a CSS gradient in API order (for accents/strips). */
export function apiGradient(colors: string[] | null | undefined, angle = 180): string {
  const p = agentPalette(colors);
  const n = p.stops.length;
  const stops = p.stops.map((c, i) => `${c} ${Math.round((i / Math.max(1, n - 1)) * 100)}%`).join(", ");
  return `linear-gradient(${angle}deg, ${stops})`;
}
