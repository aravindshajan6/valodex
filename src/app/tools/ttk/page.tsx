import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";
import { TtkCalculator } from "@/components/weapons/TtkCalculator";
import { toWeaponSummary } from "@/components/weapons/serialize";
import { listWeapons } from "@/lib/queries/weapons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "TTK calculator",
  description: "Time-to-kill calculator for every Valorant weapon: distance, armor, hit location, and a 3D range visualizer.",
};

export default async function TtkPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const initialSlugs = w
    ?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const rows = await listWeapons();
  const weapons = rows.map((r) => toWeaponSummary(r));

  return (
    <>
      <PageHero
        eyebrow="Tools · 01"
        title={
          <>
            Time to <span className="text-red">kill</span>
          </>
        }
        description="Pick up to four weapons, set the distance, armor and where your bullets land, and watch the shot timeline play out on a target dummy. Every number comes from the live damage tables."
      />
      <Container className="pb-24">
        <TtkCalculator weapons={weapons} initialSlugs={initialSlugs} />
      </Container>
    </>
  );
}
