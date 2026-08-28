import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge, Container, PageHero, SectionHeading, Stat } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import { CalloutList } from "@/features/maps/CalloutList";
import { MapGallery } from "@/features/maps/MapGallery";
import { MapNav } from "@/features/maps/MapNav";
import { TacticalMap } from "@/features/maps/TacticalMap";
import { t } from "@/lib/i18n";
import { hasMinimapTransform, projectCallouts } from "@/lib/minimap";
import { getMapBySlug, getMapNeighbors, listMapSlugs } from "@/lib/queries/maps";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listMapSlugs()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const map = await getMapBySlug(slug);
  if (!map) return { title: "Map not found" };
  const name = t(map.displayName);
  const tactical = t(map.tacticalDescription);
  const description = t(map.narrativeDescription) || [name, tactical, t(map.coordinates)].filter(Boolean).join(" — ");
  return {
    title: name,
    description,
    openGraph: { title: `${name} — Valorum`, description, images: map.splash ? [{ url: map.splash }] : undefined },
  };
}

export default async function MapPage({ params }: Params) {
  const { slug } = await params;
  const [map, neighbors] = await Promise.all([getMapBySlug(slug), getMapNeighbors(slug)]);
  if (!map) notFound();

  const name = t(map.displayName);
  const tactical = t(map.tacticalDescription);
  const coordinates = t(map.coordinates);
  const narrative = t(map.narrativeDescription);
  const callouts = projectCallouts(
    map,
    map.callouts.map((c) => ({ id: c.id, name: t(c.regionName), superRegion: c.superRegion, superRegionName: t(c.superRegionName), x: c.x, y: c.y, z: c.z })),
  );
  const positioned = callouts.length > 0 && hasMinimapTransform(map) && Boolean(map.displayIcon);
  const siteCount = tactical ? tactical.replace(/\s*sites?$/i, "").split("/").filter(Boolean).length : 0;
  const regionCount = new Set(callouts.map((c) => c.superRegion)).size;

  return (
    <>
      <PageHero
        eyebrow={coordinates ? `Map // ${coordinates}` : "Map"}
        title={name}
        description={narrative || undefined}
        media={map.splash ? <Image src={map.splash} alt="" fill priority sizes="100vw" className="object-cover" /> : undefined}
      >
        <div className="flex flex-wrap gap-2" data-reveal>
          {tactical && <Badge tone="red">{tactical}</Badge>}
          {coordinates && <Badge tone="holo">{coordinates}</Badge>}
          <Badge tone={callouts.length ? "gold" : "neutral"}>{callouts.length ? `${callouts.length} callouts` : "no callouts"}</Badge>
        </div>
        <div className="mt-8 flex flex-wrap gap-10" data-reveal>
          {siteCount > 0 && <Stat label="Sites" value={siteCount} />}
          <Stat label="Callouts" value={callouts.length} />
          {regionCount > 0 && <Stat label="Regions" value={regionCount} />}
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <Container>
          <RevealGroup>
            <SectionHeading
              eyebrow={positioned ? "Tactical board" : callouts.length ? "Callouts" : "Key art"}
              title={positioned ? <>Callouts <span className="text-holo">in 3D</span></> : callouts.length ? "Positions" : "The look"}
              description={
                positioned
                  ? "Every callout pinned onto the minimap and lifted by its in-world elevation. Orbit, hover a pin or pick from the list."
                  : callouts.length
                    ? "This mode's callouts ship without a minimap transform, so they're listed by region rather than pinned."
                    : "No callout data exists for this map — here's the art the client uses for it."
              }
              className="mb-10"
            />
            {positioned ? (
              <div data-reveal>
                <TacticalMap icon={map.displayIcon!} mapName={name} callouts={callouts} />
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <MapGallery
                  name={name}
                  stylized={map.stylizedBackgroundImage}
                  background={map.backgroundImage}
                  listViewIcon={map.listViewIcon}
                  listViewIconTall={map.listViewIconTall}
                  premier={map.premierBackgroundImage}
                />
                {callouts.length > 0 && (
                  <div data-reveal>
                    <CalloutList callouts={callouts} className="lg:self-start" />
                  </div>
                )}
              </div>
            )}
          </RevealGroup>
        </Container>
      </section>

      <section className="border-t border-line py-12">
        <Container>
          <MapNav prev={neighbors.prev} next={neighbors.next} />
        </Container>
      </section>
    </>
  );
}
