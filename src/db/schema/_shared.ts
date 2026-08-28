import { jsonb, text, timestamp } from "drizzle-orm/pg-core";
import type { Localized } from "@/lib/i18n";

export const localized = (name: string) => jsonb(name).$type<Localized>();
export const uuidPk = () => text("uuid").primaryKey();
/** Untouched upstream record, so nothing is lost when the API adds fields. */
export const raw = () => jsonb("raw").$type<Record<string, unknown>>().notNull();
export const syncedAt = () => timestamp("synced_at", { withTimezone: true }).defaultNow().notNull();
