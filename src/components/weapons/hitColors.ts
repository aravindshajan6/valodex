import type { HitLocation } from "@/lib/ttk";

/**
 * Hit-location identity colors. Validated as a categorical triple against the
 * panel surface (#1b2836) with the dataviz palette validator: lightness band,
 * chroma floor, CVD separation and contrast all pass. Head keeps the brand red.
 */
export const HIT_COLORS: Record<HitLocation, string> = {
  head: "#ff4655",
  body: "#3987e5",
  leg: "#199e70",
};

export const HIT_LABELS: Record<HitLocation, string> = { head: "Head", body: "Body", leg: "Legs" };
