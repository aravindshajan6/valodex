"use client";

import { animate, stagger } from "animejs";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RevealGroup } from "@/components/motion";
import { Container, SectionHeading } from "@/components/ui";
import { AgentCard } from "@/features/agents/AgentCard";
import type { AgentCardData } from "@/features/agents/types";
import type { BrowserSkin } from "@/features/skins/SkinBrowser";
import { SkinCard, type SkinCardData } from "@/features/skins/SkinCard";
import type { TierInfo } from "@/features/skins/tier";
import { WeaponCard } from "@/features/weapons/WeaponCard";
import type { WeaponSummary } from "@/features/weapons/types";
import { countFavourites, FAVOURITE_KINDS, useFavourites, type FavouriteKind, type Favourites } from "@/hooks/useFavourites";
import { cn } from "@/lib/cn";

type Props = {
  agents: AgentCardData[];
  weapons: WeaponSummary[];
  skins: BrowserSkin[];
  tiers: TierInfo[];
  /** weapon slug -> localised name, for the skin card's caption. */
  weaponNames: Record<string, string>;
};

const PARAM: Record<FavouriteKind, string> = { agents: "a", weapons: "w", skins: "s" };

const btn = "chamfer-sm inline-flex h-9 items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-[0.2em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo";
const btnQuiet = cn(btn, "border-line text-bone-2 hover:border-bone-2 hover:text-bone");
const btnHolo = cn(btn, "border-holo/50 text-holo hover:bg-holo/10");
const btnRed = cn(btn, "border-red/60 text-red hover:bg-red hover:text-ink");

/**
 * Client half of /favourites. Reads the localStorage list, resolves it against the
 * catalogues the page shipped, and renders the same cards the browse pages use.
 * `?a=jett,raze&w=vandal&s=<uuid>` switches it into read-only "shared list" mode.
 */
export function FavouritesBoard({ agents, weapons, skins, tiers, weaponNames }: Props) {
  const { favourites, hydrated, remove, merge, clear } = useFavourites();
  const [shared, setShared] = useState<Favourites | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const agentByUuid = useMemo(() => new Map(agents.map((a) => [a.uuid, a])), [agents]);
  const weaponByUuid = useMemo(() => new Map(weapons.map((w) => [w.uuid, w])), [weapons]);
  const skinByUuid = useMemo(() => new Map(skins.map((s) => [s.uuid, s])), [skins]);
  const tierByName = useMemo(() => new Map(tiers.map((t) => [t.devName, t])), [tiers]);

  // Shared links carry slugs for agents/weapons (short, readable) and UUIDs for skins
  // (skin slugs are only unique per weapon). Read the URL as an external store, like /skins.
  useEffect(() => {
    const agentBySlug = new Map(agents.map((a) => [a.slug, a.uuid]));
    const weaponBySlug = new Map(weapons.map((w) => [w.slug, w.uuid]));
    const applyUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const list = (k: string) => (params.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      const next: Favourites = {
        agents: list(PARAM.agents).map((s) => agentBySlug.get(s)).filter((x): x is string => Boolean(x)),
        weapons: list(PARAM.weapons).map((s) => weaponBySlug.get(s)).filter((x): x is string => Boolean(x)),
        skins: list(PARAM.skins).filter((id) => skinByUuid.has(id)),
      };
      setShared(countFavourites(next) ? next : null);
      setSaved(null);
    };
    applyUrl();
    window.addEventListener("popstate", applyUrl);
    return () => window.removeEventListener("popstate", applyUrl);
  }, [agents, weapons, skinByUuid]);

  const active = shared ?? favourites;
  const isShared = shared !== null;

  const resolvedAgents = active.agents.map((id) => agentByUuid.get(id)).filter((x): x is AgentCardData => Boolean(x));
  const resolvedWeapons = active.weapons.map((id) => weaponByUuid.get(id)).filter((x): x is WeaponSummary => Boolean(x));
  const resolvedSkins: SkinCardData[] = active.skins
    .map((id) => skinByUuid.get(id))
    .filter((x): x is BrowserSkin => Boolean(x))
    .map((s) => ({
      uuid: s.uuid,
      name: s.name,
      href: `/skins/${s.weapon}/${s.slug}`,
      icon: s.icon,
      weaponName: weaponNames[s.weapon] ?? s.weapon,
      tier: tierByName.get(s.tier) ?? null,
      hasVideo: s.hasVideo,
    }));
  const total = resolvedAgents.length + resolvedWeapons.length + resolvedSkins.length;

  // IDs we stored that no longer resolve (an item vanished from the API).
  const missing = useMemo(() => {
    const lookup: Record<FavouriteKind, (id: string) => boolean> = {
      agents: (id) => agentByUuid.has(id),
      weapons: (id) => weaponByUuid.has(id),
      skins: (id) => skinByUuid.has(id),
    };
    return FAVOURITE_KINDS.flatMap((kind) => favourites[kind].filter((id) => !lookup[kind](id)).map((id) => ({ kind, id })));
  }, [favourites, agentByUuid, weaponByUuid, skinByUuid]);

  const shareUrl = () => {
    const params = new URLSearchParams();
    const a = favourites.agents.map((id) => agentByUuid.get(id)?.slug).filter(Boolean).join(",");
    const w = favourites.weapons.map((id) => weaponByUuid.get(id)?.slug).filter(Boolean).join(",");
    const s = favourites.skins.filter((id) => skinByUuid.has(id)).join(",");
    if (a) params.set(PARAM.agents, a);
    if (w) params.set(PARAM.weapons, w);
    if (s) params.set(PARAM.skins, s);
    return `${window.location.origin}/favourites?${params.toString()}`;
  };

  const copyShare = async () => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const saveShared = () => {
    if (!shared) return;
    setSaved(merge(shared));
  };

  const viewMine = () => {
    window.history.pushState(null, "", "/favourites");
    setShared(null);
    setSaved(null);
  };

  const doClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clear();
    setConfirmClear(false);
  };

  const pruneMissing = () => {
    for (const kind of FAVOURITE_KINDS) {
      const ids = missing.filter((m) => m.kind === kind).map((m) => m.id);
      if (ids.length) remove(kind, ids);
    }
  };

  // Nothing to say until localStorage has been read — avoid flashing the empty state.
  if (!hydrated) return <div aria-busy="true" className="min-h-[40vh]" />;

  return (
    <section aria-label="Favourites">
      {/* ---- toolbar ------------------------------------------------------------ */}
      <div className="sticky top-16 z-30 border-y border-line bg-ink/85 backdrop-blur-md">
        <Container className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mute" aria-live="polite">
            {isShared ? (
              <>
                <span className="text-holo">Shared list</span> · <span className="text-bone">{total}</span> items
              </>
            ) : (
              <>
                <span className="text-bone">{resolvedAgents.length}</span> agents · <span className="text-bone">{resolvedWeapons.length}</span> weapons ·{" "}
                <span className="text-bone">{resolvedSkins.length}</span> skins
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {isShared ? (
              <>
                <button type="button" onClick={saveShared} className={btnHolo} disabled={saved !== null}>
                  {saved === null ? "Save to my favourites" : saved === 0 ? "Already saved" : `Saved ${saved} new`}
                </button>
                <button type="button" onClick={viewMine} className={btnQuiet}>
                  View mine →
                </button>
              </>
            ) : (
              <>
                {total > 0 && (
                  <button type="button" onClick={copyShare} className={btnHolo}>
                    <span aria-hidden>{copied ? "✓" : "⇗"}</span> {copied ? "Link copied" : "Share list"}
                  </button>
                )}
                {total > 0 && (
                  <button type="button" onClick={doClear} className={confirmClear ? btnRed : btnQuiet} aria-live="polite">
                    {confirmClear ? "Click again to clear" : "Clear all"}
                  </button>
                )}
              </>
            )}
          </div>
        </Container>
      </div>

      <Container className="pb-24">
        {isShared && (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
            You&apos;re looking at someone else&apos;s picks. Saving merges them into your own list.
          </p>
        )}

        {!isShared && missing.length > 0 && (
          <div className="chamfer-sm mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-ink-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
            <span>
              {missing.length} saved item{missing.length === 1 ? "" : "s"} no longer exist{missing.length === 1 ? "s" : ""} in the game data
            </span>
            <button type="button" onClick={pruneMissing} className="text-red hover:text-bone">
              Remove {missing.length === 1 ? "it" : "them"}
            </button>
          </div>
        )}

        {total === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-20 pt-12">
            {resolvedAgents.length > 0 && (
              <Section eyebrow="01 / Agents" title="Agents" count={resolvedAgents.length}>
                <Grid ids={resolvedAgents.map((a) => a.uuid)} className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                  {resolvedAgents.map((a, i) => (
                    <li key={a.uuid} data-fav={a.uuid} className="min-w-0">
                      <AgentCard agent={a} priority={i < 4} />
                    </li>
                  ))}
                </Grid>
              </Section>
            )}
            {resolvedWeapons.length > 0 && (
              <Section eyebrow="02 / Weapons" title="Weapons" count={resolvedWeapons.length}>
                <Grid ids={resolvedWeapons.map((w) => w.uuid)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {resolvedWeapons.map((w) => (
                    <li key={w.uuid} data-fav={w.uuid}>
                      <WeaponCard weapon={w} reveal={false} />
                    </li>
                  ))}
                </Grid>
              </Section>
            )}
            {resolvedSkins.length > 0 && (
              <Section eyebrow="03 / Skins" title="Skins" count={resolvedSkins.length}>
                <Grid ids={resolvedSkins.map((s) => s.uuid)} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {resolvedSkins.map((s, i) => (
                    <li key={s.uuid} data-fav={s.uuid}>
                      <SkinCard skin={s} priority={i < 4} />
                    </li>
                  ))}
                </Grid>
              </Section>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

function Section({ eyebrow, title, count, children }: { eyebrow: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <RevealGroup>
        <div className="mb-8 flex items-end justify-between gap-6">
          <SectionHeading eyebrow={eyebrow} title={title} />
          <span data-reveal className="font-mono text-2xl tabular-nums text-bone-2">{String(count).padStart(2, "0")}</span>
        </div>
      </RevealGroup>
      {children}
    </div>
  );
}

/** Staggers new cards in whenever the id list gains members (first mount included). */
function Grid({ ids, className, children }: { ids: string[]; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const seen = useRef<Set<string>>(new Set());
  const key = ids.join("|");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fresh = ids.filter((id) => !seen.current.has(id));
    ids.forEach((id) => seen.current.add(id));
    if (!fresh.length) return;
    const targets = fresh
      .map((id) => el.querySelector<HTMLElement>(`[data-fav="${CSS.escape(id)}"]`))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!targets.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(targets, { opacity: [0, 1], translateY: [18, 0], duration: 600, delay: stagger(40), ease: "outExpo" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}

function EmptyState() {
  const links = [
    { href: "/agents", label: "Agents", hint: "Star the operatives you main" },
    { href: "/weapons", label: "Weapons", hint: "Keep your buy-round picks handy" },
    { href: "/skins", label: "Skins", hint: "Build a wishlist for the next sale" },
  ];
  return (
    <RevealGroup className="pt-16">
      <div data-reveal className="chamfer relative overflow-hidden border border-line bg-ink-3 px-6 py-16 text-center sm:py-24">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-40" />
        <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden className="relative mx-auto text-gold/70">
          <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <p className="display relative mt-4 text-4xl text-bone sm:text-5xl">Nothing starred yet</p>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-bone-2">
          Hit the <span className="text-gold">★</span> on any agent, weapon or skin card and it lands here. Everything stays in this browser — nothing to sign up for.
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            data-reveal
            className="group chamfer-sm flex items-center justify-between gap-4 border border-line bg-ink-2 px-4 py-3 transition-colors hover:border-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo"
          >
            <span>
              <span className="display block text-2xl text-bone">{l.label}</span>
              <span className="block text-xs text-bone-2">{l.hint}</span>
            </span>
            <span aria-hidden className="font-mono text-red transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
          </Link>
        ))}
      </div>
    </RevealGroup>
  );
}
