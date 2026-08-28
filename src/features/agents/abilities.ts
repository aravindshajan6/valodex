import { t, type Localized } from "@/lib/i18n";
import type { AbilityData, AbilitySlot } from "./types";

/** Display order requested for the kit: signature abilities, then grenade, ult, and any passive. */
const SLOT_ORDER: Record<AbilitySlot, number> = { Ability1: 0, Ability2: 1, Grenade: 2, Ultimate: 3, Passive: 4 };

/** Default in-game keybinds per slot. */
export const SLOT_KEY: Record<AbilitySlot, string | null> = { Grenade: "C", Ability1: "Q", Ability2: "E", Ultimate: "X", Passive: null };

export const SLOT_LABEL: Record<AbilitySlot, string> = {
  Ability1: "Signature",
  Ability2: "Basic",
  Grenade: "Basic",
  Ultimate: "Ultimate",
  Passive: "Passive",
};

function isSlot(s: string): s is AbilitySlot {
  return s in SLOT_ORDER;
}

type AbilityRow = { slot: string; order: number; displayName: Localized; description: Localized | null; displayIcon: string | null };

/** Map DB rows into ordered plain props. Unknown slots are dropped. */
export function toAbilityData(rows: AbilityRow[]): AbilityData[] {
  return rows
    .filter((r): r is AbilityRow & { slot: AbilitySlot } => isSlot(r.slot))
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.order - b.order)
    .map((r) => ({
      slot: r.slot,
      key: SLOT_KEY[r.slot],
      name: t(r.displayName),
      description: t(r.description),
      icon: r.displayIcon,
    }));
}
