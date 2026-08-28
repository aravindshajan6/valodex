import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { runSync } from "@/sync";

// postgres.js needs the Node runtime, and a sync must never be served from cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A cold full sync moves ~15 MB and takes well under a minute; give it headroom. */
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : (req.headers.get("x-sync-secret") ?? "");
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

async function handle(req: Request) {
  if (!process.env.SYNC_SECRET) {
    // Fail closed: an unset secret must not leave the endpoint open.
    return Response.json({ error: "SYNC_SECRET is not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const force = params.get("force") === "1" || params.has("force");
  const only = params.get("only")?.split(",").filter(Boolean);

  try {
    const lines: string[] = [];
    const result = await runSync({ force, only, log: (l) => lines.push(l) });

    // ISR pages hold data for an hour; a sync that changed anything should show up now.
    if (result.status === "synced") revalidatePath("/", "layout");

    return Response.json({ ...result, log: lines });
  } catch (err) {
    console.error("[sync] failed", err);
    return Response.json({ error: err instanceof Error ? err.message : "sync failed" }, { status: 500 });
  }
}

/** Vercel Cron (and most schedulers) issue GET. */
export const GET = handle;
export const POST = handle;
