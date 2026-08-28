"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { SkinSummary, SkinTier } from "./types";

const ALL = "all";
const NONE = "standard";

function tierStyle(tier: SkinTier | null): React.CSSProperties | undefined {
  if (!tier?.color) return undefined;
  return { borderColor: `${tier.color}99`, color: tier.color };
}

/**
 * Skin grid with a tier filter. Clicking a skin opens an inline viewer with
 * chroma swatches (swap the render) and level videos.
 */
export function SkinGallery({ weaponSlug, weaponName, skins }: { weaponSlug: string; weaponName: string; skins: SkinSummary[] }) {
  const [tier, setTier] = useState<string>(ALL);
  const [openUuid, setOpenUuid] = useState<string | null>(null);

  const tiers = useMemo(() => {
    const map = new Map<string, SkinTier>();
    for (const s of skins) if (s.tier) map.set(s.tier.uuid, s.tier);
    return [...map.values()].sort((a, b) => b.rank - a.rank);
  }, [skins]);
  const hasStandard = skins.some((s) => !s.tier);

  const visible = useMemo(() => {
    if (tier === ALL) return skins;
    if (tier === NONE) return skins.filter((s) => !s.tier);
    return skins.filter((s) => s.tier?.uuid === tier);
  }, [skins, tier]);

  const open = openUuid ? skins.find((s) => s.uuid === openUuid) ?? null : null;

  return (
    <div>
      <div role="group" aria-label="Filter skins by tier" className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={tier === ALL} onClick={() => setTier(ALL)}>
          All <span className="text-mute">{skins.length}</span>
        </FilterChip>
        {tiers.map((t) => (
          <FilterChip key={t.uuid} active={tier === t.uuid} onClick={() => setTier(t.uuid)} style={tier === t.uuid ? undefined : tierStyle(t)}>
            {t.name} <span className="text-mute">{skins.filter((s) => s.tier?.uuid === t.uuid).length}</span>
          </FilterChip>
        ))}
        {hasStandard && (
          <FilterChip active={tier === NONE} onClick={() => setTier(NONE)}>
            Standard <span className="text-mute">{skins.filter((s) => !s.tier).length}</span>
          </FilterChip>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((s) => (
          <li key={s.uuid}>
            <button
              type="button"
              onClick={() => setOpenUuid(s.uuid)}
              aria-haspopup="dialog"
              className="chamfer group relative flex w-full flex-col border border-line bg-ink-3 text-left outline-none transition-[transform,border-color] duration-300 ease-out-expo hover:-translate-y-1 hover:border-red/60 focus-visible:border-holo"
            >
              <span className="relative block aspect-[5/2] w-full">
                {s.displayIcon ? (
                  <Image src={s.displayIcon} alt="" fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw" className="object-contain p-4 transition-transform duration-500 ease-out-expo group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-mute">No preview</span>
                )}
              </span>
              <span className="flex items-start justify-between gap-2 px-3 pb-3">
                <span className="line-clamp-2 text-sm text-bone">{s.name}</span>
                {s.tier && (
                  <span className="shrink-0 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={tierStyle(s.tier)}>
                    {s.tier.devName}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-mute">No skins in this tier.</p>}

      {open && <SkinViewer skin={open} weaponSlug={weaponSlug} weaponName={weaponName} onClose={() => setOpenUuid(null)} />}
    </div>
  );
}

function FilterChip({ active, onClick, style, children }: { active: boolean; onClick: () => void; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={cn(
        "chamfer-sm inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo",
        active ? "border-red bg-red text-bone" : "border-line text-bone-2 hover:border-bone-2 hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

function SkinViewer({ skin, weaponSlug, weaponName, onClose }: { skin: SkinSummary; weaponSlug: string; weaponName: string; onClose: () => void }) {
  const [chromaIdx, setChromaIdx] = useState(0);
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const chroma = skin.chromas[chromaIdx] ?? skin.chromas[0] ?? null;
  const level = levelIdx != null ? skin.levels[levelIdx] ?? null : null;
  const video = level?.video ?? (levelIdx == null ? chroma?.video ?? null : null);
  const render = chroma?.fullRender ?? skin.displayIcon;
  const levelsWithVideo = skin.levels.filter((l) => l.video);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/85 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skin-viewer-title"
        onClick={(e) => e.stopPropagation()}
        className="chamfer relative max-h-[92dvh] w-full max-w-4xl overflow-y-auto border border-line bg-ink-2"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">
              {weaponName} skin{skin.tier ? ` · ${skin.tier.name}` : ""}
            </div>
            <h3 id="skin-viewer-title" className="display mt-1 text-3xl text-bone">
              {skin.name}
            </h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="chamfer-sm border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-2 outline-none hover:border-red hover:text-bone focus-visible:ring-1 focus-visible:ring-holo">
            Esc
          </button>
        </div>

        <div className="relative aspect-[16/7] w-full bg-ink">
          {skin.wallpaper && <Image src={skin.wallpaper} alt="" fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover opacity-40" />}
          <div className="bg-grid absolute inset-0 opacity-50" />
          {video ? (
            <video key={video} src={video} muted loop playsInline autoPlay preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
          ) : render ? (
            <Image key={render} src={render} alt={`${skin.name}${chroma ? `, ${chroma.name}` : ""}`} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-contain p-8 drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]" />
          ) : null}
        </div>

        <div className="grid gap-6 px-5 py-5 sm:grid-cols-2">
          {skin.chromas.length > 1 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Chromas</div>
              <div className="flex flex-wrap gap-2">
                {skin.chromas.map((c, i) => (
                  <button
                    key={c.uuid}
                    type="button"
                    aria-pressed={chromaIdx === i && levelIdx == null}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => {
                      setChromaIdx(i);
                      setLevelIdx(null);
                    }}
                    className={cn("chamfer-sm relative h-10 w-10 overflow-hidden border bg-ink-3 outline-none transition-transform hover:scale-105 focus-visible:ring-1 focus-visible:ring-holo", chromaIdx === i && levelIdx == null ? "border-red" : "border-line")}
                  >
                    {c.swatch ? <Image src={c.swatch} alt="" fill sizes="40px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-bone-2">{i + 1}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {levelsWithVideo.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Levels</div>
              <div className="flex flex-wrap gap-2">
                {skin.levels.map((l, i) =>
                  l.video ? (
                    <button
                      key={l.uuid}
                      type="button"
                      aria-pressed={levelIdx === i}
                      onClick={() => setLevelIdx(levelIdx === i ? null : i)}
                      className={cn("chamfer-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-holo", levelIdx === i ? "border-red bg-red text-bone" : "border-line text-bone-2 hover:text-bone")}
                    >
                      Lv {i + 1}
                      {l.levelItem && <span className="ml-1.5 normal-case tracking-normal text-mute">{l.levelItem.replace(/-/g, " ")}</span>}
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            {skin.chromas.length} chroma{skin.chromas.length === 1 ? "" : "s"} · {skin.levels.length} level{skin.levels.length === 1 ? "" : "s"}
          </span>
          <Link href={`/skins/${weaponSlug}/${skin.slug}`} className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-holo outline-none hover:underline focus-visible:ring-1 focus-visible:ring-holo">
            Open in Skins <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
