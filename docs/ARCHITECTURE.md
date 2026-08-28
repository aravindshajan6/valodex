# Architecture

## Directory map

```
valodex/
├── docs/                    ARCHITECTURE.md (this file), DATA.md
├── drizzle/                 generated SQL migrations
├── public/
├── src/
│   ├── app/                 routes only — one folder per URL segment
│   ├── components/          shared, domain-agnostic UI
│   │   ├── layout/          Nav, Footer
│   │   ├── motion/          RevealGroup, Magnetic (anime.js)
│   │   ├── three/           SceneCanvas, lazyScene — the 3D plumbing
│   │   └── ui/              Container, Panel, Badge, Stat, SectionHeading, PageHero, SeeAlso
│   ├── config/              site.ts — name, description, base URL, nav links
│   ├── db/                  client.ts + schema/ (one file per domain)
│   ├── features/            domain UI, one folder per section of the site
│   │   ├── agents/ bundles/ gamemodes/ home/ maps/
│   │   └── ranks/ seasons/ skins/ weapons/
│   ├── hooks/               useMediaQuery, useReducedMotion, useWebGL, useInView
│   ├── lib/                 pure helpers: cn, color, i18n, minimap, slug, ttk
│   │   └── queries/         all database reads, one file per domain
│   └── sync/                valorant-api.com → Postgres importer
```

**The rule:** `components/` is anything two unrelated sections could use; `features/` is
everything tied to one section. A feature may import from `components/`, `hooks/`, `lib/`
and `config/`, and occasionally from another feature (bundles reuses the skin card).
Nothing in `components/` may import from `features/`.

## Data flow

```
valorant-api.com ──(npm run sync)──► Postgres ──(src/lib/queries)──► server components
                                                                          │
                                                          plain serialisable props
                                                                          ▼
                                                        client components ── anime.js / R3F
```

Pages are server components with `export const revalidate = 3600`. They fetch through
`src/lib/queries/*` and hand plain props down; no component queries the database itself.

## The 3D layer

Scenes are `"use client"` components that render `<SceneCanvas>`. Because `ssr: false`
dynamic imports are illegal inside server components, each scene has a sibling
`Foo.lazy.tsx` that wraps it in `lazyScene(...)`; pages import the `.lazy` module.

`SceneCanvas` adds two things every scene needs: an error boundary (a scene that throws —
no WebGL, lost context, bad texture — renders `null` so the DOM fallback shows), and a
re-measure nudge on mount.

**Mount a canvas in the same commit as its container.** Gating it behind state that flips
after hydration (a WebGL probe, a 2D/3D toggle) can leave it measured at 0×0, and R3F then
never renders the scene. Layer a DOM fallback *under* the canvas instead of gating it.

## Motion

Wrap server markup in `<RevealGroup>`; descendants marked `data-reveal` stagger in and
`data-count="123"` counts up. The hide-until-revealed CSS is scoped to `[data-reveal-root]`,
so a `data-reveal` outside a group renders normally instead of staying invisible.

## Localisation

Every human-readable string is stored as an 18-locale map (`?language=all`), typed
`Localized`. Render with `t(value)` from `@/lib/i18n` — never the raw value.
