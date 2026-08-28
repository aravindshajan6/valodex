/**
 * Colour primitives for API data.
 *
 * valorant-api ships colours as RGBA hex WITHOUT a leading `#` — agent gradients
 * (`"371c5cff"`), competitive tiers (`"6ae2afff"`), content tiers (`"00958733"`).
 * Every conversion in the app goes through here.
 */

/** The page ground; `darken` mixes toward it so tinted UI stays on-palette. */
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

const toHex = ({ r, g, b }: Rgb) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** `"6ae2afff"` -> `"#6ae2af"`; alpha dropped. Safe to hand to `new THREE.Color(...)`. */
export function rgbaHex(value: string | null | undefined, fallback = "#ece8e1"): string {
  if (!value || value.replace(/^#/, "").length < 6) return fallback;
  return toHex(parse(value));
}

/** `"0f192300"` -> `"rgba(15, 25, 35, 0)"` — keeps alpha for CSS. */
export function rgbaHexToCss(value: string | null | undefined, fallback = "transparent"): string {
  if (!value || value.replace(/^#/, "").length < 6) return fallback;
  const { r, g, b, a } = parse(value);
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

/** `#rrggbb` with a CSS alpha: `withAlpha("#ff4655", 0.4)` -> `rgba(255, 70, 85, 0.4)`. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Ink-ish or white-ish stops carry no identity — agent gradients drop them. */
export function isUsableStop(hex: string): boolean {
  const { r, g, b, a } = parse(hex);
  if (a < 0.5) return false;
  const nearInk = Math.abs(r - 15) < 12 && Math.abs(g - 25) < 12 && Math.abs(b - 35) < 12;
  const nearWhite = r > 225 && g > 225 && b > 225;
  return !nearInk && !nearWhite;
}
