import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import type { AgentCardData } from "@/features/agents/types";
import { FavouritesBoard } from "@/features/favourites/FavouritesBoard";
import type { BrowserSkin } from "@/features/skins/SkinBrowser";
import { hexColor, type TierInfo } from "@/features/skins/tier";
import { toWeaponSummary } from "@/features/weapons/serialize";
import { t } from "@/lib/i18n";
import { listPlayableAgents } from "@/lib/queries/agents";
import { listBrowsableSkins, listContentTiers, listWeaponsWithSkinCounts } from "@/lib/queries/skins";
import { countSkinsByWeapon, listWeapons } from "@/lib/queries/weapons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Favourites",
  description: "Your starred agents, weapons and skins — saved in this browser, shareable by link.",
  // Personal to each browser; nothing for a crawler to index.
  robots: { index: false, follow: true },
};

/**
 * The list itself lives in localStorage, so this page ships compact catalogues
 * of everything that *can* be favourited and the client resolves stored UUIDs
 * against them after hydration. Same payload shape the /skins browser already sends.
 */
export default async function FavouritesPage() {
  const [agentRows, weaponRows, skinCounts, skinRows, tierRows, weaponNameRows] = await Promise.all([
    listPlayableAgents(),
    listWeapons(),
    countSkinsByWeapon(),
    listBrowsableSkins(),
    listContentTiers(),
    listWeaponsWithSkinCounts(),
  ]);

  const agents: AgentCardData[] = agentRows.map((a) => ({
    uuid: a.uuid,
    slug: a.slug,
    name: t(a.displayName),
    developerName: a.developerName,
    roleUuid: a.roleUuid,
    roleName: a.role ? t(a.role.displayName) : null,
    roleIcon: a.role?.displayIcon ?? null,
    fullPortrait: a.fullPortrait,
    displayIcon: a.displayIcon,
    background: a.background,
    gradientColors: a.backgroundGradientColors,
    rightFacing: a.isFullPortraitRightFacing,
  }));
  const weapons = weaponRows.map((r) => toWeaponSummary(r, skinCounts.get(r.uuid) ?? 0));
  const skins: BrowserSkin[] = skinRows.map((r) => ({
    uuid: r.uuid,
    name: t(r.displayName),
    slug: r.slug,
    weapon: r.weaponSlug,
    tier: r.tier,
    icon: r.icon ?? null,
    hasVideo: Boolean(r.hasVideo),
  }));
  const tiers: TierInfo[] = tierRows.map((tier) => ({
    devName: tier.devName,
    name: t(tier.displayName),
    rank: tier.rank,
    color: hexColor(tier.highlightColor),
    icon: tier.displayIcon,
  }));
  const weaponNames = Object.fromEntries(weaponNameRows.map((w) => [w.slug, t(w.displayName)]));

  return (
    <>
      <PageHero
        eyebrow="Codex / Favourites"
        title={
          <>
            Your <span className="text-red">loadout</span>
          </>
        }
        description="Every agent, weapon and skin you've starred. Saved in this browser — no account, no sign-in — and shareable with a single link."
      />
      <FavouritesBoard agents={agents} weapons={weapons} skins={skins} tiers={tiers} weaponNames={weaponNames} />
    </>
  );
}
