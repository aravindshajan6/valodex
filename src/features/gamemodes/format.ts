/** Plain props for a game mode card + drawer (server → client). */
export type GamemodeCard = {
  uuid: string;
  slug: string;
  name: string;
  description: string;
  duration: string | null;
  roundsPerHalf: number | null;
  orbCount: number | null;
  economyType: string | null;
  minimapHidden: boolean;
  teamVoice: boolean;
  allowsTimeouts: boolean;
  allowsReplays: boolean;
  teamRoles: string[];
  rules: Array<{ label: string; on: boolean }>;
  features: Array<{ label: string; on: boolean }>;
  /** 960×540 list art */
  art: string | null;
  /** 128px glyph */
  glyph: string | null;
  kind: string;
  limited: boolean;
};

/**
 * `EGameRuleBoolName::CombatReportOnlyShowLastLife` → `Combat Report Only Show Last Life`
 * `EGameFeatureToggleName::RemoveDeletedFXCsFromPool` → `Remove Deleted FXCs From Pool`
 */
export function humanizeEnum(value: string): string {
  const tail = value.includes("::") ? value.split("::").pop()! : value;
  return tail
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Derive a display category from the upstream description's leading phrase. */
export function classify(description: string, duration: string | null): { kind: string; limited: boolean } {
  const limited = /^LIMITED TIME/i.test(description);
  const body = description.replace(/^LIMITED TIME:\s*/i, "");
  if (/^Plant\/defuse/i.test(body)) return { kind: "Plant / Defuse", limited };
  if (/^Defuse\/Protect/i.test(body)) return { kind: "Defuse / Protect", limited };
  if (/^Elimination/i.test(body)) return { kind: "Elimination", limited };
  if (/team deathmatch/i.test(body)) return { kind: "Elimination", limited };
  if (/^Same rules as unrated/i.test(body)) return { kind: "Plant / Defuse", limited };
  if (/elimination battles/i.test(body)) return { kind: "Skirmish", limited };
  if (!duration) return { kind: "Practice", limited };
  return { kind: "Other", limited };
}
