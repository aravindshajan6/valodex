# Valodex — project conventions

Valorant codex built on live game data from valorant-api.com. Next.js 16 (App Router, React 19), Tailwind v4, Drizzle + Postgres, React Three Fiber (three) + drei + postprocessing for 3D, anime.js v4 for DOM motion.

## Run
- `npm run db:up` → Postgres in docker. `npm run db:push` → apply schema. `npm run sync` → pull all of valorant-api.com into the DB (version-gated; `--force` to re-run, `--only=weapons,maps` for a subset).
- `npm run dev` for the app. `npx tsc --noEmit` to type-check.

## Data
- Directory layout and the shared-vs-feature rule: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). API quirks: [docs/DATA.md](docs/DATA.md).
- Schema lives in `src/db/schema/*.ts`, one file per domain. Every table has `raw jsonb` holding the untouched upstream record.
- **All human-readable strings are `Localized` maps** (`{"en-US": "...", "ja-JP": "..."}`) — render them with `t(value)` from `@/lib/i18n`, never `value` directly.
- Enums are normalized to kebab-case (`rifle`, `medium`, `semi-automatic`, `rof-increase`). Colors from the API are RGBA hex without `#` (`"6ae2afff"`) — slice to 6 chars and prefix `#`.
- Images/videos are hotlinked from `media.valorant-api.com` (CORS open, already in `next.config.ts` remotePatterns). Use `next/image` with explicit sizes, or plain `<img>`/`<video>` for 3D textures and skin videos.
- Read data through `src/lib/queries/*.ts` (Drizzle relational queries). Add queries to the file for your domain; don't query from components.
- Pages are server components; they fetch via queries and pass plain props to client components. Use `export const revalidate = 3600` on data pages.
- Localized fields are `Localized | null` in types; guard nulls.

## Design system (already built — use it, don't fork it)
- Tokens in `src/app/globals.css` via Tailwind `@theme`: colors `ink ink-2 ink-3 line bone bone-2 mute red red-2 holo gold`; fonts `font-display` (Anton) `font-sans` (Inter) `font-mono` (JetBrains Mono).
- Utilities: `.display` (uppercase Anton headline), `.chamfer` / `.chamfer-sm` (angled corner cut), `.bg-grid`.
- Primitives in `@/components/ui`: `Container`, `SectionHeading`, `PageHero`, `Panel`, `Badge`, `Stat`, `SeeAlso`.
- Domain UI lives in `@/features/<domain>/`; `@/components/**` is shared only and must never import from a feature.
- Shared hooks in `@/hooks`: `useMediaQuery`, `useReducedMotion`, `useWebGL`, `useInView`, `useFavourites` — don't re-implement these per feature.
- Favourites are `localStorage`-only (no accounts). Put a `<FavouriteButton kind id name>` from `@/components/ui` *beside* a card's link (never inside it) and it works everywhere; `/favourites` resolves stored UUIDs client-side. See docs/ARCHITECTURE.md → Favourites.
- Colour conversion in `@/lib/color` (`rgbaHex`, `rgbaHexToCss`, `lighten`, `darken`, `withAlpha`); site name/URL/nav in `@/config/site`.
- Motion in `@/components/motion`: wrap server markup in `<RevealGroup>`; `data-reveal` only animates inside a `RevealGroup` (the hide-until-revealed CSS is scoped to the group, so a stray one renders normally instead of vanishing); `SectionHeading` uses `data-reveal` internally, so always wrap it (`PageHero` already does); mark children `data-reveal` to stagger-fade them in and `data-count="123"` to count numbers up. `<Magnetic>` for CTAs. For bespoke sequences, `import { animate, stagger, createTimeline } from "animejs"` inside a `"use client"` component's `useEffect`.
- 3D: build scenes as default-exported `"use client"` components that render `<SceneCanvas>` from `@/components/three/SceneCanvas`. Next forbids `ssr:false` dynamic imports in server components, so give every scene a sibling `FooScene.lazy.tsx` containing `"use client"; import { lazyScene } from "@/components/three/Scene3D"; export default lazyScene(() => import("./FooScene"));` and import the `.lazy` module from pages. Never import three in a server component. Keep geometry procedural (no external model files). Respect `prefers-reduced-motion` (`useReducedMotion` pattern: check `window.matchMedia` and slow/stop `useFrame` work).
- Look: dark, cinematic, Valorant-adjacent — red signal, cyan holo accents, chamfered edges, mono eyebrows, huge condensed headlines. Generous whitespace; no rounded-2xl SaaS blobs.
- Accessibility: every interactive 3D element has a DOM equivalent; images have alt; focus states visible.

## Working in parallel (agents)
- Own only the paths assigned to you. Never edit `src/app/layout.tsx`, `globals.css`, `src/components/**`, `src/hooks/*`, `src/config/*`, `src/lib/color.ts`, `src/db/*`, `src/sync/*`, or another agent's paths. If you need a shared change, note it in your final report instead.
- Do not run `npm run build` or `npm run dev` — another process owns the `.next` dir. Verify with `npx tsc --noEmit` and `npx eslint <your files>`; ignore type errors in files you don't own.
- Nav links already exist for `/agents /weapons /maps /skins /bundles /ranks /seasons /tools/ttk`; build to those routes.
