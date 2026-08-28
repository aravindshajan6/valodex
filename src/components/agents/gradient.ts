/**
 * Agent gradient helpers. valorant-api ships `backgroundGradientColors` as four
 * RGBA hex strings without `#` (e.g. "371c5cff"). Index 1 is always the page ink
 * and index 3 is usually a transparent ink, so the useful colour information is
 * stops 0 and 2 — with a couple of agents shipping pure white as stop 2.
 */

export const INK = "#0f1923";

type Rgb = { r: number; g: number; b: number };

function parse(hex: string): Rgb & { a: number } {
  const h = hex.replace(/^#/, "").padEnd(8, "f");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: parseInt(h.slice(6, 8), 16) / 255,
  };
}

const toHex = ({ r, g, b }: Rgb) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** `"371c5cff"` -> `"#371c5c"`; alpha is dropped. Safe to hand to `new THREE.Color(...)`. */
export function rgbaHexToHex(hex: string): string {
  return toHex(parse(hex));
}

/** `"0f192300"` -> `"rgba(15, 25, 35, 0)"` — keeps alpha for CSS. */
export function rgbaHexToCss(hex: string): string {
  const { r, g, b, a } = parse(hex);
  return a >= 1 ? toHex({ r, g, b }) : `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/** Mix `hex` toward white (`amount` 0..1). */
export function lighten(hex: string, amount: number): string {
  const c = parse(hex);
  return toHex({ r: c.r + (255 - c.r) * amount, g: c.g + (255 - c.g) * amount, b: c.b + (255 - c.b) * amount });
}

/** Mix `hex` toward ink (`amount` 0..1). */
export function darken(hex: string, amount: number): string {
  const c = parse(hex);
  const ink = parse(INK);
  return toHex({ r: c.r + (ink.r - c.r) * amount, g: c.g + (ink.g - c.g) * amount, b: c.b + (ink.b - c.b) * amount });
}

/** `#rrggbb` with a CSS alpha, e.g. `withAlpha("#ff4655", 0.4)` -> `rgba(255, 70, 85, 0.4)`. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isUsable(hex: string): boolean {
  const { r, g, b, a } = parse(hex);
  if (a < 0.5) return false;
  const nearInk = Math.abs(r - 15) < 12 && Math.abs(g - 25) < 12 && Math.abs(b - 35) < 12;
  const nearWhite = r > 225 && g > 225 && b > 225;
  return !nearInk && !nearWhite;
}

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
    stops: raw.length ? raw.map(rgbaHexToCss) : [primary, INK, accent, "rgba(15, 25, 35, 0)"],
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
