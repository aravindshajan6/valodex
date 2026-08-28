import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { weaponSkins, weapons } from "@/db/schema";

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

/** Slugs only — for `generateStaticParams`. */
export async function listWeaponSlugs() {
  const rows = await db.select({ slug: weapons.slug }).from(weapons).orderBy(asc(weapons.slug));
  return rows.map((r) => r.slug);
}

/** `weaponUuid -> number of skins`, for the list page cards. */
export async function countSkinsByWeapon() {
  const rows = await db.select({ weaponUuid: weaponSkins.weaponUuid, count: count() }).from(weaponSkins).groupBy(weaponSkins.weaponUuid);
  return new Map(rows.map((r) => [r.weaponUuid, Number(r.count)]));
}

export type WeaponRow = Awaited<ReturnType<typeof listWeapons>>[number];
export type WeaponDetailRow = NonNullable<Awaited<ReturnType<typeof getWeaponBySlug>>>;
