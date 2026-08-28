/* eslint-disable @typescript-eslint/no-explicit-any -- upstream records are intentionally loose; the DB `raw` column keeps them whole */
/** Thin client for valorant-api.com. All list calls use `?language=all` so strings arrive as locale maps. */
const BASE = process.env.VALORANT_API_BASE ?? "https://valorant-api.com/v1";

type Envelope<T> = { status: number; data: T; error?: string };

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "valodex-sync/0.1" } });
      const body = (await res.json()) as Envelope<T>;
      if (!res.ok || body.status !== 200) throw new Error(`${path}: HTTP ${res.status} ${body.error ?? ""}`.trim());
      return body.data;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

export type VersionInfo = {
  manifestId: string;
  branch: string;
  version: string;
  buildVersion: string;
  engineVersion: string;
  riotClientVersion: string;
  riotClientBuild: string;
  buildDate: string;
};

export const api = {
  version: () => get<VersionInfo>("version"),
  /** Localized list endpoint. Records are `any` on purpose: the DB `raw` column keeps them whole. */
  list: (endpoint: string) => get<Record<string, any>[]>(endpoint, { language: "all" }),
};
