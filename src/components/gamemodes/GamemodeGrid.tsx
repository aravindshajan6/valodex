"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import type { GamemodeCard } from "./format";

const ART_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

function Pip({ on }: { on: boolean }) {
  return (
    <span className={cn("inline-flex h-4 min-w-10 items-center justify-center border px-1 font-mono text-[9px] uppercase tracking-[0.2em]", on ? "border-holo/60 text-holo" : "border-line text-mute")}>
      {on ? "on" : "off"}
    </span>
  );
}

function Drawer({ mode, onClose }: { mode: GamemodeCard; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flags: Array<{ label: string; on: boolean }> = [
    { label: "Minimap", on: !mode.minimapHidden },
    { label: "Team voice", on: mode.teamVoice },
    { label: "Match timeouts", on: mode.allowsTimeouts },
    { label: "Custom game replays", on: mode.allowsReplays },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="gamemode-drawer-title"
        className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto border-t border-line bg-ink-2 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(32rem,100vw)] sm:border-l sm:border-t-0"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-ink">
          {mode.art && <Image src={mode.art} alt="" fill sizes="(min-width: 640px) 32rem, 100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink-2/40 to-transparent" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 chamfer-sm border border-line bg-ink/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2 hover:border-red hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo"
          >
            Close
          </button>
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            {mode.glyph && <Image src={mode.glyph} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-contain" />}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-red">{mode.kind}</div>
              <h2 id="gamemode-drawer-title" className="display text-4xl text-bone">{mode.name}</h2>
            </div>
          </div>
        </div>

        <div className="space-y-7 p-5 sm:p-6">
          {mode.description && <p className="text-sm leading-relaxed text-bone-2">{mode.description}</p>}

          <div className="flex flex-wrap gap-2">
            {mode.limited && <Badge tone="red">Limited time</Badge>}
            {mode.duration && <Badge tone="holo">{mode.duration}</Badge>}
            {mode.roundsPerHalf != null && mode.roundsPerHalf > 0 && <Badge>{mode.roundsPerHalf} rounds / half</Badge>}
            {mode.orbCount != null && mode.orbCount > 0 && <Badge>{mode.orbCount} orb{mode.orbCount === 1 ? "" : "s"}</Badge>}
            {mode.economyType && <Badge>economy: {mode.economyType}</Badge>}
            {mode.teamRoles.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </div>

          <section>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">Match settings</h3>
            <ul className="divide-y divide-line border-y border-line">
              {flags.map((f) => (
                <li key={f.label} className="flex items-center justify-between py-2 text-sm text-bone">
                  {f.label}
                  <Pip on={f.on} />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">Rule overrides · {mode.rules.length}</h3>
            {mode.rules.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {mode.rules.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-4 py-2 text-sm text-bone">
                    {r.label}
                    <Pip on={r.on} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">Runs on the default rule set.</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">Feature toggles · {mode.features.length}</h3>
            {mode.features.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {mode.features.map((f) => (
                  <li key={f.label} className="flex items-center justify-between gap-4 py-2 text-sm text-bone">
                    {f.label}
                    <Pip on={f.on} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">No feature toggles.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export function GamemodeGrid({ modes }: { modes: GamemodeCard[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = modes.find((m) => m.slug === openSlug) ?? null;
  const close = useCallback(() => setOpenSlug(null), []);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map((mode) => (
          // One RevealGroup per card: the whole grid is many viewports tall on mobile, so a single group would never hit its threshold.
          <li key={mode.uuid}>
            <RevealGroup as="article" className="h-full">
            <button
              type="button"
              data-reveal
              onClick={() => setOpenSlug(mode.slug)}
              aria-haspopup="dialog"
              aria-expanded={openSlug === mode.slug}
              className="chamfer group flex h-full w-full flex-col border border-line bg-ink-3 text-left transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:border-red/60 hover:shadow-[0_20px_60px_-20px_rgba(255,70,85,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-ink">
                {mode.art ? (
                  <Image src={mode.art} alt={`${mode.name} key art`} fill sizes={ART_SIZES} className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105" />
                ) : (
                  <div className="bg-grid absolute inset-0 opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-3 via-ink-3/30 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  {mode.limited && <Badge tone="red">Limited</Badge>}
                  <Badge className="bg-ink/70">{mode.kind}</Badge>
                </div>
                {mode.glyph && <Image src={mode.glyph} alt="" width={36} height={36} sizes="36px" className="absolute bottom-3 right-4 h-9 w-9 object-contain opacity-90" />}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <h3 className="display text-3xl text-bone">{mode.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {mode.duration && <Badge tone="holo">{mode.duration}</Badge>}
                  {mode.roundsPerHalf != null && mode.roundsPerHalf > 0 && <Badge>{mode.roundsPerHalf} rounds / half</Badge>}
                  {mode.orbCount != null && mode.orbCount > 0 && <Badge>{mode.orbCount} orb{mode.orbCount === 1 ? "" : "s"}</Badge>}
                </div>
                {mode.description && <p className="text-sm leading-relaxed text-bone-2">{mode.description}</p>}
                <span className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mute transition-colors group-hover:text-red">
                  {mode.rules.length + mode.features.length} overrides →
                </span>
              </div>
            </button>
            </RevealGroup>
          </li>
        ))}
      </ul>
      {open && <Drawer mode={open} onClose={close} />}
    </>
  );
}
