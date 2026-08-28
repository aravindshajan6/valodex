"use client";

import { createTimeline, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type HeroLine = { text: string; accent?: boolean };

/**
 * Hero copy block. The headline is split into per-character spans and staged in
 * with an anime.js timeline (translateY + blur + a little rotateX), then the
 * eyebrow, pitch and CTAs follow. Reduced-motion users get the final state.
 */
export function HeroTitle({
  eyebrow,
  lines,
  pitch,
  children,
}: {
  eyebrow: React.ReactNode;
  lines: HeroLine[];
  pitch: React.ReactNode;
  children?: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-hero-char]"));
    const rest = Array.from(el.querySelectorAll<HTMLElement>("[data-hero-el]"));
    const rule = el.querySelector<HTMLElement>("[data-hero-rule]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      [...chars, ...rest].forEach((n) => (n.style.opacity = "1"));
      if (rule) rule.style.transform = "none";
      return;
    }

    const tl = createTimeline({ defaults: { ease: "outExpo" } });
    tl.add(
      chars,
      {
        opacity: [0, 1],
        translateY: ["0.55em", "0em"],
        rotateX: [-70, 0],
        filter: ["blur(14px)", "blur(0px)"],
        duration: 1100,
        delay: stagger(24),
      },
      200,
    );
    if (rule) tl.add(rule, { scaleX: [0, 1], duration: 900, ease: "inOutQuart" }, "-=900");
    tl.add(
      rest,
      {
        opacity: [0, 1],
        translateY: [18, 0],
        filter: ["blur(8px)", "blur(0px)"],
        duration: 900,
        delay: stagger(130),
      },
      "-=750",
    );
    return () => {
      tl.pause();
    };
  }, []);

  return (
    <div ref={root} className="max-w-4xl">
      {/* Hide staged elements only when JS is on; no-JS renders the final state. */}
      <style>{`@media (scripting: enabled){[data-hero-char],[data-hero-el]{opacity:0}[data-hero-rule]{transform:scaleX(0)}}`}</style>

      <div data-hero-el className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-holo">
        <span className="h-px w-8 bg-holo" />
        {eyebrow}
      </div>

      <h1 aria-label={lines.map((l) => l.text).join(" ")} className="display text-[17vw] leading-[0.88] sm:text-8xl lg:text-[8.5rem] xl:text-[9.5rem]" style={{ perspective: "800px" }}>
        {lines.map((line, li) => (
          <span key={li} className={cn("block", line.accent ? "text-red" : "text-bone")}>
            {line.text.split(" ").map((word, wi) => (
              <span key={wi} className="inline-block whitespace-nowrap" style={{ transformStyle: "preserve-3d" }}>
                {Array.from(word).map((ch, ci) => (
                  <span key={ci} data-hero-char aria-hidden className="inline-block will-change-transform" style={{ transformOrigin: "50% 100%" }}>
                    {ch}
                  </span>
                ))}
                {wi < line.text.split(" ").length - 1 && <span aria-hidden className="inline-block w-[0.25em]" />}
              </span>
            ))}
          </span>
        ))}
      </h1>

      <div data-hero-rule aria-hidden className="mt-6 h-[2px] w-24 origin-left bg-red" />

      <p data-hero-el className="mt-6 max-w-xl text-base leading-relaxed text-bone-2 sm:text-lg">
        {pitch}
      </p>

      {children && (
        <div data-hero-el className="mt-8 flex flex-wrap gap-3 sm:gap-4">
          {children}
        </div>
      )}
    </div>
  );
}
