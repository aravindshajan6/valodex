# Valorum

A Valorant codex — agents, weapons, maps, skins, bundles, ranks, seasons and a time-to-kill calculator — built on live game data from [valorant-api.com](https://valorant-api.com), with Three.js scenes and anime.js motion throughout.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Drizzle ORM · Postgres 16 · React Three Fiber + drei + postprocessing · anime.js v4

## Getting started

```bash
cp .env.example .env        # defaults point at the docker Postgres below
npm install
npm run db:up               # Postgres in docker (valorum/valorum @ localhost:5432)
npm run db:push             # apply the Drizzle schema
npm run sync                # pull the whole valorant-api.com catalog (~15 MB, ~10 s)
npm run dev                 # http://localhost:3000
```

`npm run sync` is version-gated: it records the upstream `manifestId` and skips if nothing changed. Use `-- --force` to re-run, or `-- --only=weapons,maps` for a subset.

To keep data fresh automatically, point a scheduler at `GET /api/sync` with the `SYNC_SECRET` bearer token — `vercel.json` already declares a 6-hourly cron. See [docs/DATA.md](./docs/DATA.md#keeping-it-fresh).

## Data

Everything human-readable is stored as a locale map (`{"en-US": "...", "ja-JP": "..."}`) via `?language=all`, so the whole site can be localized later without re-syncing. Every table keeps the untouched upstream record in a `raw` column. Media is hotlinked from `media.valorant-api.com`.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the directory layout and how the 3D layer is wired, [docs/DATA.md](./docs/DATA.md) for the API's shape and its quirks, and [CLAUDE.md](./CLAUDE.md) for the design-system conventions.

## Disclaimer

Valorum isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
