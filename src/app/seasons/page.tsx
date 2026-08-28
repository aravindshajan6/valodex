import type { Metadata } from "next";
import { Badge, Container, PageHero, SectionHeading } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import { getSyncState, listEvents, listSeasons } from "@/lib/queries/meta";
import { buildTimeline } from "@/components/seasons/build";
import { SeasonTimeline } from "@/components/seasons/SeasonTimeline";
import { LiveActPanel } from "@/components/seasons/LiveActPanel";
import { SeeAlso } from "@/components/gamemodes/SeeAlso";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Seasons",
  description: "Every Valorant episode and act on one timeline, with the live act's progress and event passes marked.",
};

const buildFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function SeasonsPage() {
  const [rows, eventRows, sync] = await Promise.all([listSeasons(), listEvents(), getSyncState()]);
  const now = new Date();
  const { episodes, live } = buildTimeline(rows, eventRows, now);
  const actCount = rows.filter((r) => r.type === "act").length;
  const episodeCount = episodes.length;

  return (
    <>
      <PageHero
        eyebrow="Timeline"
        title={
          <>
            Seasons <span className="text-red">&amp;</span> Acts
          </>
        }
        description={`${episodeCount} episodes, ${actCount} acts and ${eventRows.length} event passes, drawn to scale. Red is now.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {sync ? (
            <>
              <Badge tone="holo">{sync.branch}</Badge>
              <Badge>v{sync.version}</Badge>
              {sync.buildDate && <Badge>built {buildFmt.format(sync.buildDate)}</Badge>}
            </>
          ) : (
            <Badge>patch unknown</Badge>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">progress computed {buildFmt.format(now)}</span>
        </div>
      </PageHero>

      <section className="pb-16">
        <Container>
          <RevealGroup>
            <LiveActPanel live={live} />
          </RevealGroup>
        </Container>
      </section>

      <section className="pb-20 sm:pb-28">
        <Container>
          <RevealGroup>
            <SectionHeading eyebrow="Every episode" title="The full run" description="Newest at the top. Segment width is proportional to act length; diamonds mark event passes." />
            <div className="mb-6 mt-8 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
              <span className="flex items-center gap-2"><span className="h-3 w-5 border border-red bg-red/30" /> current</span>
              <span className="flex items-center gap-2"><span className="h-3 w-5 border border-line bg-ink-3" /> past</span>
              <span className="flex items-center gap-2"><span className="h-3 w-5 border border-dashed border-line" /> upcoming</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rotate-45 bg-gold" /> event pass</span>
            </div>
          </RevealGroup>
          {/* Outside the RevealGroup on purpose: the list is many viewports tall, so a single intersection threshold would never fire. Rows draw themselves in. */}
          <SeasonTimeline episodes={episodes} />
        </Container>
      </section>

      <SeeAlso
        links={[
          { href: "/ranks", label: "Ranks", hint: "The competitive ladder, Iron to Radiant" },
          { href: "/gamemodes", label: "Game modes", hint: "Every queue and its rule overrides" },
        ]}
      />
    </>
  );
}
