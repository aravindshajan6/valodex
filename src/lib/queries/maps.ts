import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { maps } from "@/db/schema";

export async function listMaps() {
  return db.query.maps.findMany({ with: { callouts: true }, orderBy: [asc(maps.slug)] });
}

export type MapWithCallouts = Awaited<ReturnType<typeof listMaps>>[number];

export async function getMapBySlug(slug: string) {
  return db.query.maps.findFirst({ where: eq(maps.slug, slug), with: { callouts: true } });
}

/** Slugs only, for `generateStaticParams`. */
export async function listMapSlugs() {
  return db.query.maps.findMany({ columns: { slug: true }, orderBy: [asc(maps.slug)] });
}

/** Previous/next map in slug order (wrapping), with just enough fields for a nav link. */
export async function getMapNeighbors(slug: string) {
  const all = await db.query.maps.findMany({
    columns: { slug: true, displayName: true, listViewIcon: true, splash: true },
    orderBy: [asc(maps.slug)],
  });
  const i = all.findIndex((m) => m.slug === slug);
  if (i === -1 || all.length < 2) return { prev: null, next: null };
  return { prev: all[(i - 1 + all.length) % all.length], next: all[(i + 1) % all.length] };
}
