import type { Metadata } from "next";
import { PageHero, Stat } from "@/components/ui";
import SkinFieldScene from "@/features/skins/SkinFieldScene.lazy";
import { SkinBrowser, type BrowserSkin, type WeaponOption } from "@/features/skins/SkinBrowser";
import { hexColor, type TierInfo } from "@/features/skins/tier";
import { t } from "@/lib/i18n";
import { listBrowsableSkins, listContentTiers, listWeaponsWithSkinCounts } from "@/lib/queries/skins";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Skins",
  description: "Browse every Valorant weapon skin by weapon, tier and name — with chroma renders, level videos and bundle links.",
};

export default async function SkinsPage() {
  const [rows, tierRows, weaponRows] = await Promise.all([listBrowsableSkins(), listContentTiers(), listWeaponsWithSkinCounts()]);

  const tiers: TierInfo[] = tierRows.map((tier) => ({
    devName: tier.devName,
    name: t(tier.displayName),
    rank: tier.rank,
    color: hexColor(tier.highlightColor),
    icon: tier.displayIcon,
  }));
  const weapons: WeaponOption[] = weaponRows
    .filter((w) => w.skinCount > 0)
    .map((w) => ({ slug: w.slug, name: t(w.displayName), icon: w.displayIcon, category: w.category, count: w.skinCount }));
  const skins: BrowserSkin[] = rows.map((r) => ({
    uuid: r.uuid,
    name: t(r.displayName),
    slug: r.slug,
    weapon: r.weaponSlug,
    tier: r.tier,
    icon: r.icon ?? null,
    hasVideo: Boolean(r.hasVideo),
  }));
  const withVideo = skins.filter((s) => s.hasVideo).length;
  const ultra = skins.filter((s) => s.tier === "Ultra" || s.tier === "Exclusive").length;

  return (
    <>
      <PageHero
        eyebrow="Codex / Skins"
        title={
          <>
            Skin <span className="text-red">Browser</span>
          </>
        }
        description="Every tiered weapon skin in the game, sortable by edition and weapon. Open one for its chromas, upgrade levels and the bundle it shipped in."
        media={<SkinFieldScene colors={tiers.map((tier) => tier.color)} />}
      >
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div data-reveal><Stat label="Skins" value={skins.length} /></div>
          <div data-reveal><Stat label="With video" value={withVideo} /></div>
          <div data-reveal><Stat label="Exclusive + Ultra" value={ultra} /></div>
          <div data-reveal><Stat label="Weapons" value={weapons.length} /></div>
        </div>
      </PageHero>
      <SkinBrowser skins={skins} tiers={tiers} weapons={weapons} />
    </>
  );
}
