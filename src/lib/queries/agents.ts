import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { agentRoles, agents } from "@/db/schema";
import { t } from "@/lib/i18n";

export async function listPlayableAgents() {
  return db.query.agents.findMany({
    where: eq(agents.isPlayableCharacter, true),
    with: { role: true, abilities: { orderBy: (a, { asc }) => [asc(a.order)] } },
    orderBy: [asc(agents.slug)],
  });
}

export async function getAgentBySlug(slug: string) {
  return db.query.agents.findFirst({
    where: eq(agents.slug, slug),
    with: { role: true, abilities: { orderBy: (a, { asc }) => [asc(a.order)] } },
  });
}

/** All four roles (Duelist / Controller / Initiator / Sentinel), sorted by English name. */
export async function listAgentRoles() {
  const roles = await db.query.agentRoles.findMany();
  return roles.sort((a, b) => t(a.displayName).localeCompare(t(b.displayName)));
}

/** Lightweight slug + name index of playable agents, in the same order as the list page. */
export async function listAgentIndex() {
  return db
    .select({ slug: agents.slug, displayName: agents.displayName })
    .from(agents)
    .where(eq(agents.isPlayableCharacter, true))
    .orderBy(asc(agents.slug));
}

/** Prev/next agent (wrapping) relative to `slug`, for detail-page pagination. */
export async function getAgentNeighbors(slug: string) {
  const index = await listAgentIndex();
  const i = index.findIndex((a) => a.slug === slug);
  if (i === -1 || index.length < 2) return { prev: null, next: null };
  const n = index.length;
  return { prev: index[(i - 1 + n) % n], next: index[(i + 1) % n] };
}

/** Other playable agents sharing a role, excluding `excludeSlug`. */
export async function listSquad(roleUuid: string, excludeSlug: string) {
  return db
    .select({
      slug: agents.slug,
      displayName: agents.displayName,
      bustPortrait: agents.bustPortrait,
      displayIcon: agents.displayIcon,
      backgroundGradientColors: agents.backgroundGradientColors,
      roleName: agentRoles.displayName,
    })
    .from(agents)
    .leftJoin(agentRoles, eq(agents.roleUuid, agentRoles.uuid))
    .where(and(eq(agents.isPlayableCharacter, true), eq(agents.roleUuid, roleUuid), ne(agents.slug, excludeSlug)))
    .orderBy(asc(agents.slug));
}
