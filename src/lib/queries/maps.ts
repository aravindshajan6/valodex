import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { maps } from "@/db/schema";

export async function listMaps() {
  return db.query.maps.findMany({ with: { callouts: true }, orderBy: [asc(maps.slug)] });
}

export async function getMapBySlug(slug: string) {
  return db.query.maps.findFirst({ where: eq(maps.slug, slug), with: { callouts: true } });
}
