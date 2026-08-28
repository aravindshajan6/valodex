import type { Metadata } from "next";
import { BundleGrid } from "@/features/bundles/BundleGrid";
import type { BundleCardData } from "@/features/bundles/BundleCard";
import { PageHero, Stat } from "@/components/ui";
import { t } from "@/lib/i18n";
import { listBundles } from "@/lib/queries/skins";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bundles",
  description: "Every Valorant store bundle with its skins, player cards, sprays and buddies, reconstructed from the bundle's theme.",
};

export default async function BundlesPage() {
  const rows = await listBundles();
  const bundles: BundleCardData[] = rows
    .map((b) => ({
      uuid: b.uuid,
      slug: b.slug,
      name: t(b.displayName),
      sub: t(b.displayNameSubText),
      logo: b.logoIcon,
      vertical: b.verticalPromoImage,
      icon: b.displayIcon,
      counts: b.counts,
      total: b.total,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));

  // No release dates in the API, so "featured" = the bundles we can attribute the most items to.
  const featured = [...bundles]
    .sort((a, b) => b.total - a.total || b.counts.skins - a.counts.skins || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((b) => b.uuid);
  const resolved = rows.filter((b) => b.total > 0).length;
  const totalSkins = rows.reduce((n, b) => n + b.counts.skins, 0);

  return (
    <>
      <PageHero
        eyebrow="Codex / Bundles"
        title={
          <>
            Store <span className="text-red">Bundles</span>
          </>
        }
        description="The API ships bundles without an item list, so Valodex rebuilds each one from its theme: every skin, player card, spray and buddy that shares it."
      >
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div data-reveal><Stat label="Bundles" value={bundles.length} /></div>
          <div data-reveal><Stat label="With contents" value={resolved} /></div>
          <div data-reveal><Stat label="Skins attributed" value={totalSkins} /></div>
        </div>
      </PageHero>
      <BundleGrid bundles={bundles} featured={featured} />
    </>
  );
}
