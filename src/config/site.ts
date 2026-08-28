export const SITE = {
  name: "Valorum",
  description: "The Valorant codex: agents, weapons, maps, skins, ranks and tools — built on live game data.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  source: { label: "valorant-api.com", href: "https://valorant-api.com" },
} as const;

export const NAV_LINKS = [
  { href: "/agents", label: "Agents" },
  { href: "/weapons", label: "Weapons" },
  { href: "/maps", label: "Maps" },
  { href: "/skins", label: "Skins" },
  { href: "/bundles", label: "Bundles" },
  { href: "/ranks", label: "Ranks" },
  { href: "/seasons", label: "Seasons" },
  { href: "/gamemodes", label: "Modes" },
  { href: "/tools/ttk", label: "TTK" },
] as const;
