import type { Metadata } from "next";
import { Container, PageHero, Stat } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import { MapGrid } from "@/components/maps/MapGrid";
import type { MapCardData } from "@/components/maps/MapCard";
import { t } from "@/lib/i18n";
import { listMaps } from "@/lib/queries/maps";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Maps",
  description: "Every Valorant map with sites, callouts and coordinates — from the competitive pool to the Range.",
};

export default async function MapsPage() {
  const maps = await listMaps();
  const cards: MapCardData[] = maps.map((m) => ({
    slug: m.slug,
    name: t(m.displayName),
    tactical: t(m.tacticalDescription),
    coordinates: t(m.coordinates),
    splash: m.splash,
    displayIcon: m.displayIcon,
    calloutCount: m.callouts.length,
  }));
  // Competitive-pool cards first, then the rest, each alphabetical.
  cards.sort((a, b) => Number(b.calloutCount > 0) - Number(a.calloutCount > 0) || a.name.localeCompare(b.name));
  const pool = cards.filter((c) => c.calloutCount > 0);
  const totalCallouts = cards.reduce((n, c) => n + c.calloutCount, 0);

  return (
    <>
      <PageHero
        eyebrow="Codex // Maps"
        title={<>The <span className="text-red">theatres</span></>}
        description="Every battleground in the protocol's files — sites, callouts and the in-world coordinates the maps are pinned to. Open a map for the 3D tactical board."
      >
        <div className="flex flex-wrap gap-10">
          <Stat label="Maps" value={cards.length} />
          <Stat label="With callouts" value={pool.length} />
          <Stat label="Callouts" value={totalCallouts} />
        </div>
      </PageHero>
      <section className="pb-24">
        <Container>
          <RevealGroup>
            <div data-reveal>
              <MapGrid maps={cards} />
            </div>
          </RevealGroup>
        </Container>
      </section>
    </>
  );
}
