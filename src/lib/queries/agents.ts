import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agents } from "@/db/schema";

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
