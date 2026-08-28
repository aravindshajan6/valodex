import type { Metadata } from "next";
import { Container, PageHero, Stat } from "@/components/ui";
import { listGamemodes } from "@/lib/queries/meta";
import { t } from "@/lib/i18n";
import { GamemodeGrid } from "@/features/gamemodes/GamemodeGrid";
import { classify, humanizeEnum, type GamemodeCard } from "@/features/gamemodes/format";
import { SeeAlso } from "@/components/ui/SeeAlso";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Game modes",
  description: "Every Valorant queue — duration, rounds, orbs and the rule overrides that make each mode tick.",
};

/**
 * Hidden on purpose:
 *  - `onboarding`  → the new-player-experience shell (no icon, no description, no duration; NPE asset path).
 *  - `bot-match`   → internal bot training match (`ExamplePlayerTestBot` asset path, no description).
 * `skirmish` / `skirmish-ascension` share a description but are distinct playable variants, so both stay.
 */
const HIDDEN = new Set(["onboarding", "bot-match"]);

/** Player-facing order: core queues first, then alt modes, then practice. Anything new lands after, alphabetically. */
const ORDER = [
  "standard",
  "swiftplay",
  "spike-rush",
  "replication",
  "deathmatch",
  "team-deathmatch",
  "escalation",
  "knockout",
  "retake",
  "all-random-one-site",
  "snowball-fight",
  "skirmish",
  "skirmish-ascension",
  "the-range",
  "basic-training",
];

export default async function GamemodesPage() {
  const rows = await listGamemodes();
  const modes: GamemodeCard[] = rows
    .filter((r) => !HIDDEN.has(r.slug))
    .map((r) => {
      const description = t(r.description);
      const duration = t(r.duration) || null;
      const { kind, limited } = classify(description, duration);
      return {
        uuid: r.uuid,
        slug: r.slug,
        name: t(r.displayName),
        description,
        duration,
        roundsPerHalf: r.roundsPerHalf,
        orbCount: r.orbCount,
        economyType: r.economyType,
        minimapHidden: r.isMinimapHidden,
        teamVoice: r.isTeamVoiceAllowed,
        allowsTimeouts: r.allowsMatchTimeouts,
        allowsReplays: r.allowsCustomGameReplays,
        teamRoles: (r.teamRoles ?? []).map(humanizeEnum),
        rules: (r.gameRuleBoolOverrides ?? []).map((o) => ({ label: humanizeEnum(o.ruleName), on: o.state })),
        features: (r.gameFeatureOverrides ?? []).map((o) => ({ label: humanizeEnum(o.featureName), on: o.state })),
        art: r.listViewIconTall,
        glyph: r.displayIcon,
        kind,
        limited,
      };
    })
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.slug);
      const ib = ORDER.indexOf(b.slug);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.slug.localeCompare(b.slug);
    });

  const limited = modes.filter((m) => m.limited).length;
  const overrides = modes.reduce((n, m) => n + m.rules.length + m.features.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Queues"
        title={
          <>
            Game <span className="text-red">modes</span>
          </>
        }
        description="Every mode in the client, from the 13-round standard to the limited-time experiments. Open one to read the rule overrides that shape it."
      >
        <div className="flex flex-wrap gap-8">
          <Stat label="Modes" value={modes.length} />
          <Stat label="Limited time" value={limited} />
          <Stat label="Rule overrides" value={overrides} />
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <Container>
          {/* Each card carries its own RevealGroup (the grid is many viewports tall on mobile). */}
          <GamemodeGrid modes={modes} />
        </Container>
      </section>

      <SeeAlso
        links={[
          { href: "/ranks", label: "Ranks", hint: "The competitive ladder, Iron to Radiant" },
          { href: "/seasons", label: "Seasons", hint: "Acts, episodes and what's live now" },
        ]}
      />
    </>
  );
}
