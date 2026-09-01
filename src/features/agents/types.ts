/** Plain-prop shapes handed from server pages to the agent client components. */

export type RoleOption = { uuid: string; name: string; icon: string | null };

export type AgentCardData = {
  uuid: string;
  slug: string;
  name: string;
  developerName: string | null;
  roleUuid: string | null;
  roleName: string | null;
  roleIcon: string | null;
  fullPortrait: string | null;
  displayIcon: string | null;
  background: string | null;
  gradientColors: string[] | null;
  rightFacing: boolean;
};

export type AbilitySlot = "Ability1" | "Ability2" | "Grenade" | "Ultimate" | "Passive";

export type AbilityData = {
  slot: AbilitySlot;
  /** In-game keybind label, null for passives. */
  key: string | null;
  name: string;
  description: string;
  icon: string | null;
};

export type BadgeTone = "neutral" | "red" | "holo" | "gold";

/** Role -> design-system badge tone. */
export function roleTone(roleName: string | null | undefined): BadgeTone {
  switch (roleName) {
    case "Duelist":
      return "red";
    case "Controller":
      return "holo";
    case "Initiator":
      return "gold";
    default:
      return "neutral";
  }
}
