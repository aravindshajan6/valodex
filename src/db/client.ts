import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse a single connection pool across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __valorumSql?: ReturnType<typeof postgres> };
// Keep the pool small: `next build` forks ~15 prerender workers, each with its own pool,
// and Postgres defaults to 100 connections.
const sql = globalForDb.__valorumSql ?? postgres(url, { max: process.env.NODE_ENV === "production" ? 4 : 8, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.__valorumSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
