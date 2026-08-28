import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { agents, bundles, maps, weaponSkins, weapons } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";

import { NAV_LINKS, SITE } from "@/config/site";

const BASE = SITE.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [a, w, m, b, s] = await Promise.all([
    db.select({ slug: agents.slug }).from(agents).where(eq(agents.isPlayableCharacter, true)),
    db.select({ slug: weapons.slug }).from(weapons),
    db.select({ slug: maps.slug }).from(maps),
    db.select({ slug: bundles.slug }).from(bundles),
    db
      .select({ slug: weaponSkins.slug, weapon: weapons.slug })
      .from(weaponSkins)
      .innerJoin(weapons, eq(weaponSkins.weaponUuid, weapons.uuid))
      .where(isNotNull(weaponSkins.contentTierUuid)),
  ]);
  const url = (p: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: `${BASE}${p}`, changeFrequency: "weekly", priority });
  return [
    url("/", 1),
    ...NAV_LINKS.map((l) => url(l.href, 0.9)),
    ...a.map((r) => url(`/agents/${r.slug}`, 0.8)),
    ...w.map((r) => url(`/weapons/${r.slug}`, 0.8)),
    ...m.map((r) => url(`/maps/${r.slug}`, 0.7)),
    ...b.map((r) => url(`/bundles/${r.slug}`, 0.5)),
    ...s.map((r) => url(`/skins/${r.weapon}/${r.slug}`, 0.4)),
  ];
}
