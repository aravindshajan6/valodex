import type { Metadata } from "next";
import { Container, PageHero, SectionHeading, Stat } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import { getCurrentTierSet, listTierSets } from "@/lib/queries/meta";
import { t } from "@/lib/i18n";
import { RankAscension } from "@/components/ranks/RankAscension";
import { HowRankedWorks } from "@/components/ranks/HowRankedWorks";
import { EpisodeStrip, type EpisodeStripSet } from "@/components/ranks/EpisodeStrip";
import { rgbaHex, tierSetLabel, type LadderTier } from "@/components/ranks/types";
import { SeeAlso } from "@/components/gamemodes/SeeAlso";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ranks",
  description: "Every competitive tier from Iron 1 to Radiant, rendered as a rising ladder, plus how ranked works and how the badges changed across episodes.",
};

const HIDDEN = new Set(["unranked", "invalid"]);

export default async function RanksPage() {
  const [current, sets] = await Promise.all([getCurrentTierSet(), listTierSets()]);
  const ladder: LadderTier[] = (current?.tiers ?? [])
    .filter((row) => !HIDDEN.has(row.division))
    .map((row) => ({
      tier: row.tier,
      name: t(row.tierName),
      division: row.division,
      divisionName: t(row.divisionName),
      color: rgbaHex(row.color),
      background: rgbaHex(row.backgroundColor, "#131e2a"),
      smallIcon: row.smallIcon,
      largeIcon: row.largeIcon,
    }));

  const divisions = ladder.reduce<Array<{ division: string; name: string; color: string }>>((acc, tier) => {
    if (!acc.some((d) => d.division === tier.division)) acc.push({ division: tier.division, name: tier.divisionName, color: tier.color });
    return acc;
  }, []);

  const stripSets: EpisodeStripSet[] = sets.map((set) => {
    const icons: EpisodeStripSet["icons"] = {};
    for (const row of set.tiers) {
      if (HIDDEN.has(row.division)) continue;
      icons[row.division] = { name: t(row.tierName), smallIcon: row.smallIcon }; // last write wins → top tier of the division
    }
    return { label: tierSetLabel(set.assetObjectName, set.order), current: set.uuid === current?.uuid, icons };
  });

  return (
    <>
      <PageHero
        eyebrow="Competitive"
        title={
          <>
            Rank <span className="text-red">Ascension</span>
          </>
        }
        description="The live ranked ladder, stacked as a helix of plates. Iron sits at the bottom; Radiant burns at the top."
      >
        <div className="flex flex-wrap gap-8">
          <Stat label="Tiers" value={ladder.length} />
          <Stat label="Divisions" value={divisions.length} />
          <Stat label="Tier sets" value={sets.length} />
          <Stat label="Live set" value={current ? tierSetLabel(current.assetObjectName, current.order) : "—"} />
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <Container>
          <RevealGroup>
            <RankAscension tiers={ladder} />
          </RevealGroup>
        </Container>
      </section>

      <section className="border-t border-line py-20 sm:py-28">
        <Container>
          <RevealGroup>
            <SectionHeading eyebrow="The rules" title="Climbing the ladder" description="The evergreen bits of ranked — nothing that shifts from act to act." />
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <HowRankedWorks />
              <EpisodeStrip sets={stripSets} divisions={divisions} />
            </div>
          </RevealGroup>
        </Container>
      </section>

      <SeeAlso
        links={[
          { href: "/seasons", label: "Seasons", hint: "Acts, episodes and what's live now" },
          { href: "/gamemodes", label: "Game modes", hint: "Every queue and its rule overrides" },
        ]}
      />
    </>
  );
}
