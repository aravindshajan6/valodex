import type { Metadata } from "next";
import { Container, PageHero, Stat } from "@/components/ui";
import { AgentGrid } from "@/components/agents/AgentGrid";
import type { AgentCardData, RoleOption } from "@/components/agents/types";
import { listAgentRoles, listPlayableAgents } from "@/lib/queries/agents";
import { t } from "@/lib/i18n";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const agents = await listPlayableAgents();
  const cover = agents.find((a) => a.slug === "jett")?.fullPortrait ?? agents[0]?.fullPortrait;
  return {
    title: "Agents",
    description: `Every one of Valorant's ${agents.length} agents — duelists, controllers, initiators and sentinels — with full kits, portraits and lore, straight from live game data.`,
    openGraph: { images: cover ? [cover] : [] },
  };
}

export default async function AgentsPage() {
  const [agents, roles] = await Promise.all([listPlayableAgents(), listAgentRoles()]);

  const cards: AgentCardData[] = agents.map((a) => ({
    slug: a.slug,
    name: t(a.displayName),
    developerName: a.developerName,
    roleUuid: a.roleUuid,
    roleName: a.role ? t(a.role.displayName) : null,
    roleIcon: a.role?.displayIcon ?? null,
    fullPortrait: a.fullPortrait,
    displayIcon: a.displayIcon,
    background: a.background,
    gradientColors: a.backgroundGradientColors,
    rightFacing: a.isFullPortraitRightFacing,
  }));
  const roleOptions: RoleOption[] = roles.map((r) => ({ uuid: r.uuid, name: t(r.displayName), icon: r.displayIcon }));
  const countByRole = (uuid: string) => agents.filter((a) => a.roleUuid === uuid).length;

  return (
    <>
      <PageHero
        eyebrow="Codex // Agents"
        title={
          <>
            Pick your <span className="text-red">agent</span>
          </>
        }
        description="Every operative on the roster, sorted into the four roles that define a Valorant comp. Open an agent for the full kit, keybinds and a holographic dossier."
      >
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <Stat label="Agents" value={agents.length} />
          {roleOptions.map((r) => (
            <Stat key={r.uuid} label={r.name} value={countByRole(r.uuid)} />
          ))}
        </div>
      </PageHero>

      <section className="pb-24 sm:pb-32">
        <Container>
          <AgentGrid agents={cards} roles={roleOptions} />
        </Container>
      </section>
    </>
  );
}
