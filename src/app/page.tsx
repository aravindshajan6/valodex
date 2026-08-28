import Link from "next/link";
import { Badge, Container, Panel, SectionHeading, Stat } from "@/components/ui";
import { Magnetic, RevealGroup } from "@/components/motion";
import HeroScene from "@/components/home/HeroScene.lazy";
import { HeroTitle } from "@/components/home/HeroTitle";
import { Ticker } from "@/components/home/Ticker";
import { AgentRail, type RailAgent } from "@/components/home/AgentRail";
import { WeaponGrid, type TeaserWeapon } from "@/components/home/WeaponGrid";
import { MapGrid, type TeaserMap } from "@/components/home/MapGrid";
import { SkinShowcase, type ShowcaseSkin } from "@/components/home/SkinShowcase";
import { getHomeMeta, getHomeStats, listHomeAgents, listHomeMaps, listMarqueeWeapons, listShowcaseSkins } from "@/lib/queries/home";
import { t } from "@/lib/i18n";

export const revalidate = 3600;

/** "6ae2afff" -> "#6ae2af" */
const hex = (rgba: string | undefined, fallback: string) => (rgba ? `#${rgba.slice(0, 6)}` : fallback);

const ctaPrimary =
  "chamfer-sm inline-flex items-center gap-3 bg-red px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-bone transition-colors hover:bg-red-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo";
const ctaSecondary =
  "chamfer-sm inline-flex items-center gap-3 border border-line bg-ink/60 px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-bone backdrop-blur transition-colors hover:border-holo hover:text-holo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo";

export default async function Home() {
  const [meta, stats, agentRows, weaponRows, mapRows, skinRows] = await Promise.all([
    getHomeMeta(),
    getHomeStats(),
    listHomeAgents(),
    listMarqueeWeapons(),
    listHomeMaps(),
    listShowcaseSkins(8),
  ]);

  const actName = meta.act ? t(meta.act.displayName) : null;
  const episodeName = meta.episode ? t(meta.episode.displayName) : null;
  const patch = meta.version ? meta.version.split(".").slice(0, 2).join(".") : null;

  const agents: RailAgent[] = agentRows.map((a) => ({
    slug: a.slug,
    name: t(a.displayName),
    role: a.role ? t(a.role.displayName) : null,
    roleIcon: a.role?.displayIcon ?? null,
    portrait: a.fullPortrait!,
    colors: [hex(a.backgroundGradientColors?.[0], "#1b2836"), hex(a.backgroundGradientColors?.[2], "#131e2a")],
    rightFacing: a.isFullPortraitRightFacing,
  }));

  const weapons: TeaserWeapon[] = weaponRows.map((w) => ({
    slug: w.slug,
    name: t(w.displayName),
    category: w.category,
    cost: w.cost,
    icon: w.displayIcon,
    fireRate: w.fireRate,
    magazine: w.magazineSize,
  }));

  const maps: TeaserMap[] = mapRows.map((m) => ({
    slug: m.slug,
    name: t(m.displayName),
    splash: m.splash!,
    minimap: m.displayIcon,
    sites: t(m.tacticalDescription),
    coordinates: t(m.coordinates),
    callouts: m.callouts.length,
  }));

  const skins: ShowcaseSkin[] = skinRows.map((s) => {
    const withVideo = s.levels.filter((l) => l.streamedVideo);
    return {
      uuid: s.uuid,
      name: t(s.displayName),
      weapon: s.weapon ? t(s.weapon.displayName) : "",
      weaponSlug: s.weapon?.slug ?? "",
      tier: s.contentTier?.devName ?? "Exclusive",
      tierColor: hex(s.contentTier?.highlightColor ?? undefined, "#f0c987"),
      icon: s.displayIcon!,
      video: withVideo.at(-1)?.streamedVideo ?? null,
    };
  });

  const tickerItems = [
    actName ? `${episodeName ? `${episodeName} ` : ""}${actName}` : "Live game data",
    patch ? `Patch ${patch}` : "valorant-api.com",
    `${stats.agents} agents`,
    `${stats.weapons} weapons`,
    `${stats.maps} maps with callouts`,
    `${stats.skins.toLocaleString("en-US")} skins`,
    `${stats.bundles} bundles`,
    `${stats.skinVideos.toLocaleString("en-US")} skin videos`,
  ];

  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <HeroScene />
        {/* contrast + ground fade over the canvas */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/70 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-ink/70 to-ink" />

        <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-24 pt-32 lg:justify-center lg:pb-32 lg:pt-40">
          <HeroTitle
            eyebrow={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-bone-2">Live</span>
                {actName && <span>{episodeName ? `${episodeName} // ${actName}` : actName}</span>}
                {patch && (
                  <span className="text-bone-2">
                    <span className="text-line">|</span> Patch {patch}
                  </span>
                )}
              </span>
            }
            lines={[{ text: "The" }, { text: "Valorant", accent: true }, { text: "Codex" }]}
            pitch="Every agent, weapon, map, skin and rank — pulled live from the game's own data and rendered the way it deserves."
          >
            <Magnetic>
              <Link href="/agents" className={ctaPrimary}>
                Browse agents <span aria-hidden>→</span>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/tools/ttk" className={ctaSecondary}>
                TTK calculator <span aria-hidden className="text-holo">◎</span>
              </Link>
            </Magnetic>
          </HeroTitle>
        </Container>

        {/* HUD corners */}
        <div aria-hidden className="pointer-events-none absolute bottom-8 left-4 z-10 hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-mute sm:left-6 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring bg-red" />
            <span className="relative inline-flex h-2 w-2 bg-red" />
          </span>
          Spike planted — scroll
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-8 right-4 z-10 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-mute sm:right-6 sm:block">
          {meta.branch ?? "release"} {meta.buildDate ? `// ${meta.buildDate.toISOString().slice(0, 10)}` : ""}
        </div>
      </section>

      <Ticker items={tickerItems} />

      {/* ---------------------------------------------------------------- STATS */}
      <section className="relative py-16 sm:py-20">
        <Container>
          <RevealGroup>
            <Panel className="overflow-hidden">
              <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Playable agents", value: stats.agents },
                  { label: "Weapons", value: stats.weapons },
                  { label: "Maps with callouts", value: stats.maps },
                  { label: "Weapon skins", value: stats.skins },
                  { label: "Bundles", value: stats.bundles },
                  { label: "Skin videos", value: stats.skinVideos },
                ].map((s) => (
                  <div key={s.label} data-reveal className="bg-ink-3 p-5 sm:p-6">
                    <Stat label={s.label} value={s.value} className="[&>span:last-child]:text-3xl sm:[&>span:last-child]:text-4xl" />
                  </div>
                ))}
              </div>
            </Panel>
            <p data-reveal className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
              Counts are read from the synced database on every build window — no hand-typed numbers.
            </p>
          </RevealGroup>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- AGENTS */}
      <section className="relative py-16 sm:py-24">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-40" />
        <Container>
          <RevealGroup>
            <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="01 / Agents" title={<>Pick your <span className="text-red">protocol</span></>} description={`${stats.agents} playable agents across four roles. Abilities, voice lines, gradients — all straight from the game files.`} />
              <Link data-reveal href="/agents" className="font-mono text-xs uppercase tracking-[0.25em] text-holo hover:text-bone">
                All agents →
              </Link>
            </div>
            <AgentRail agents={agents} />
          </RevealGroup>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- WEAPONS */}
      <section className="relative py-16 sm:py-24">
        <Container>
          <RevealGroup>
            <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="02 / Weapons" title={<>Know your <span className="text-red">damage</span></>} description="Fire rate, magazine, wall penetration and per-range damage tables for every gun in the buy menu." />
              <Link data-reveal href="/weapons" className="font-mono text-xs uppercase tracking-[0.25em] text-holo hover:text-bone">
                All weapons →
              </Link>
            </div>
            <WeaponGrid weapons={weapons} />
            <div data-reveal className="mt-10 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-sm text-bone-2">
                Line two guns up against any armour value and see exactly how many bullets — and milliseconds — it takes to win the duel.
              </p>
              <Magnetic>
                <Link href="/tools/ttk" className={ctaPrimary}>
                  Compare in TTK calculator <span aria-hidden>→</span>
                </Link>
              </Magnetic>
            </div>
          </RevealGroup>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- MAPS */}
      <section className="relative py-16 sm:py-24">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
        <Container>
          <RevealGroup>
            <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="03 / Maps" title={<>Learn the <span className="text-red">callouts</span></>} description="Hover a map to flip from splash to minimap. Every callout is plotted using the game's own world-to-minimap transform." />
              <Link data-reveal href="/maps" className="font-mono text-xs uppercase tracking-[0.25em] text-holo hover:text-bone">
                All maps →
              </Link>
            </div>
            <MapGrid maps={maps} />
          </RevealGroup>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- SKINS */}
      <section className="relative py-16 sm:py-24">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
        <Container>
          <RevealGroup>
            <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="04 / Skins"
                title={<>Top-shelf <span className="text-red">cosmetics</span></>}
                description={
                  <>
                    {stats.skins.toLocaleString("en-US")} skins, {stats.bundles} bundles, {stats.skinVideos.toLocaleString("en-US")} level videos. Hover a card to stream its finisher.
                  </>
                }
              />
              <div data-reveal className="flex gap-3">
                <Badge tone="gold">Ultra</Badge>
                <Badge tone="red">Exclusive</Badge>
              </div>
            </div>
            <SkinShowcase skins={skins} />
            <div data-reveal className="mt-8 flex flex-wrap gap-4">
              <Link href="/skins" className="font-mono text-xs uppercase tracking-[0.25em] text-holo hover:text-bone">
                Browse skins →
              </Link>
              <Link href="/bundles" className="font-mono text-xs uppercase tracking-[0.25em] text-holo hover:text-bone">
                Browse bundles →
              </Link>
            </div>
          </RevealGroup>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- CLOSING CTA */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red/10 blur-[120px]" />
        <Container>
          <RevealGroup className="flex flex-col items-center text-center">
            <div data-reveal className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-holo">
              {actName ? `${actName} is live` : "Live data"} {patch ? `// patch ${patch}` : ""}
            </div>
            <h2 data-reveal className="display text-6xl text-bone sm:text-8xl lg:text-9xl">
              Ready <span className="text-red">up.</span>
            </h2>
            <p data-reveal className="mt-6 max-w-xl text-base text-bone-2 sm:text-lg">
              Ranks, acts, bundles and the tools to settle any argument in the lobby.
            </p>
            <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
              <Magnetic>
                <Link href="/ranks" className={ctaPrimary}>
                  Ranked ladder <span aria-hidden>→</span>
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/seasons" className={ctaSecondary}>
                  Acts &amp; episodes
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/tools/ttk" className={ctaSecondary}>
                  TTK calculator
                </Link>
              </Magnetic>
            </div>
          </RevealGroup>
        </Container>
      </section>
    </>
  );
}
