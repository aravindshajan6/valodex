import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { weapons } from "@/db/schema";

export async function listWeapons() {
  return db.query.weapons.findMany({
    with: { damageRanges: { orderBy: (r, { asc }) => [asc(r.rangeStartMeters)] } },
    orderBy: [asc(weapons.cost), asc(weapons.slug)],
  });
}

export async function getWeaponBySlug(slug: string) {
  return db.query.weapons.findFirst({
    where: eq(weapons.slug, slug),
    with: {
      damageRanges: { orderBy: (r, { asc }) => [asc(r.rangeStartMeters)] },
      skins: {
        with: { theme: true, contentTier: true, chromas: { orderBy: (c, { asc }) => [asc(c.order)] }, levels: { orderBy: (l, { asc }) => [asc(l.order)] } },
      },
    },
  });
}
