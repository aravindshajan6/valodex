import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevealGroup } from "@/components/motion";
import { Container, SectionHeading } from "@/components/ui";
import { AbilityDeck } from "@/features/agents/AbilityDeck";
import { AgentHologram } from "@/features/agents/AgentHologram";
import { AgentPager } from "@/features/agents/AgentPager";
import { AgentTitle } from "@/features/agents/AgentTitle";
import { SquadStrip } from "@/features/agents/SquadStrip";
import { toAbilityData } from "@/features/agents/abilities";
import { agentPalette, heroGradient } from "@/features/agents/gradient";
import { getAgentBySlug, getAgentNeighbors, listAgentIndex, listSquad } from "@/lib/queries/agents";
import { t } from "@/lib/i18n";

export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await listAgentIndex();
  return index.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent || !agent.isPlayableCharacter) return { title: "Agent not found" };
  const name = t(agent.displayName);
  const role = agent.role ? t(agent.role.displayName) : null;
  return {
    title: `${name}${role ? ` — ${role}` : ""}`,
    description: t(agent.description) || `${name}'s full Valorant kit, keybinds and lore.`,
    openGraph: { images: agent.fullPortrait ? [agent.fullPortrait] : agent.displayIcon ? [agent.displayIcon] : [] },
  };
}

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent || !agent.isPlayableCharacter) notFound();

  const [squad, neighbors] = await Promise.all([
    agent.roleUuid ? listSquad(agent.roleUuid, agent.slug) : Promise.resolve([]),
    getAgentNeighbors(agent.slug),
  ]);

  const name = t(agent.displayName);
  const roleName = agent.role ? t(agent.role.displayName) : null;
  const palette = agentPalette(agent.backgroundGradientColors);
  const abilities = toAbilityData(agent.abilities);
  const tags = (agent.characterTags ?? []).map((tag) => t(tag)).filter(Boolean);
  const eyebrow = [roleName, agent.developerName ? `Codename ${agent.developerName}` : null].filter(Boolean).join(" · ");

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="relative overflow-hidden pt-24 sm:pt-28 lg:min-h-dvh lg:pt-32" style={{ backgroundImage: heroGradient(palette) }}>
        <div aria-hidden className="bg-grid absolute inset-0 opacity-50" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
        {/* Ghosted codename behind the layout. */}
        {agent.developerName && (
          <span aria-hidden className="display pointer-events-none absolute -right-4 top-20 select-none text-[22vw] leading-none text-bone/[0.025] lg:top-10">
            {agent.developerName}
          </span>
        )}

        <Container className="relative">
          <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
            <Link href="/agents" className="transition-colors hover:text-bone">
              Agents
            </Link>
            <span className="mx-2 text-line">/</span>
            <span className="text-bone-2">{name}</span>
          </nav>

          <div className="grid items-center gap-12 pb-20 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:gap-8 lg:pb-28">
            <div className="order-2 lg:order-1">
              <AgentTitle
                uuid={agent.uuid}
                name={name}
                eyebrow={eyebrow || "Agent"}
                description={t(agent.description)}
                role={agent.role ? { name: roleName ?? "", icon: agent.role.displayIcon, description: t(agent.role.description) } : null}
                tags={tags}
                releaseYear={agent.releaseDate ? agent.releaseDate.getUTCFullYear() : null}
                abilityCount={abilities.length}
              />
            </div>
            <div className="order-1 lg:order-2">
              <AgentHologram
                name={name}
                portrait={agent.fullPortrait}
                background={agent.background}
                gradientColors={agent.backgroundGradientColors}
                rightFacing={agent.isFullPortraitRightFacing}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------- ABILITIES */}
      <section id="abilities" className="py-16 sm:py-24">
        <Container>
          <RevealGroup>
            <SectionHeading
              eyebrow="Kit // Abilities"
              title={
                <>
                  {name}
                  <span className="text-red">&apos;s</span> kit
                </>
              }
              description="Hover or tap an ability to read it in full. Keys shown are the default in-game binds."
              className="mb-12"
            />
            <div data-reveal>
              <AbilityDeck abilities={abilities} accent={palette.accent} glow={palette.glow} />
            </div>
          </RevealGroup>
        </Container>
      </section>

      {/* ----------------------------------------------------------- SQUAD */}
      {roleName && (
        <SquadStrip
          roleName={roleName}
          members={squad.map((m) => ({ slug: m.slug, name: t(m.displayName), portrait: m.bustPortrait ?? m.displayIcon, gradientColors: m.backgroundGradientColors }))}
        />
      )}

      <AgentPager
        prev={neighbors.prev ? { slug: neighbors.prev.slug, name: t(neighbors.prev.displayName) } : null}
        next={neighbors.next ? { slug: neighbors.next.slug, name: t(neighbors.next.displayName) } : null}
      />
    </>
  );
}
