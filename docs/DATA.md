# Data notes

Everything comes from [valorant-api.com](https://valorant-api.com) — the game's own content
catalogue. **It has no player, match, rank or leaderboard data**; player-facing stats would
need Riot's production API or an unofficial service.

Synced with `npm run sync` (version-gated on the upstream `manifestId`; `--force` to re-run,
`--only=weapons,maps` for a subset). ~15 MB, about 6 seconds.

## Shape

- **Localisation.** Every string arrives as an 18-locale object via `?language=all`, stored as `jsonb`.
- **`raw` column.** Every table keeps the untouched upstream record, so new API fields are never lost.
- **Enums** are normalised to kebab-case at sync time (`EWallPenetrationDisplayType::Medium` → `medium`).
- **Colours** are RGBA hex without `#` (`"6ae2afff"`). Convert via `@/lib/color`.
- **Media** is hotlinked from `media.valorant-api.com` (CORS open, 14-day cache). Skin videos
  are served from `valorant.dyn.riotcdn.net` — a different host, which matters if a CSP is added.

## Quirks worth knowing

- **Flat skin endpoints carry no parent id.** `/weapons/skins` doesn't say which weapon a skin
  belongs to, so the sync walks `weapons → skins → chromas/levels` to derive the foreign keys.
- **Skin slugs are only unique per weapon**, hence the `/skins/[weapon]/[slug]` route.
- **Bundles have no item list.** Contents are derived by matching a bundle to its theme via a
  stable key in `raw.assetPath` (`StorefrontItem_<Key>` ↔ `Theme_<Key>_PrimaryAsset`), falling
  back to a name match. The name alone is ambiguous — there are three distinct "Reaver" themes.
- **Not every map has usable callouts.** 16 of 26 maps have any; District, Drift and Kasbah (TDM)
  have callouts but an all-zero minimap transform, so their pins would collapse to one point —
  those pages show a grouped list instead of the 3D board.
- **The minimap transform swaps axes:** `u = y·xMultiplier + xScalarToAdd`,
  `v = x·yMultiplier + yScalarToAdd`. Verified against Ascent's real minimap; no flip needed.
- **`listViewIconTall` is landscape** 960×540 art, despite the name.
- **Buy-menu grid positions are unreliable** — Ghost and Bandit both report `0,3`; Shorty and
  Bucky report none. The weapons page groups by shop category and orders by cost instead.
- **Melee has no `weaponStats`**, so every stat field is nullable.
- **Competitive tiers** ship five historical sets; the highest `order` is the live ladder.
  Each set includes `unranked` and an `invalid` placeholder row that should be filtered out.

## TTK model

Implemented in `src/lib/ttk.ts`. 100 HP plus armor (light 25, heavy 50, regen 25 — regen absorbs
like light). Each hit: `toArmor = min(armor, damage × 0.66)`, the remainder goes to health.
No rounding inside the simulation — the game tracks fractional damage and only rounds for
display. `TTK = (shots − 1) / fireRate`, so a one-shot kill is 0 ms. Shotguns assume every
pellet lands. Spin-up weapons (Odin, Ares) use their base fire rate, with a note in the UI.
