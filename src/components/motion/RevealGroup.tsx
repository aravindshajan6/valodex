"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

/**
 * Wrap any server-rendered markup. On mount (or when scrolled into view) every
 * descendant with `data-reveal` slides/fades in with a stagger, and every
 * `data-count="123"` element counts up from 0. Reduced-motion users get the
 * final state instantly (see globals.css).
 */
export function RevealGroup({
  children,
  className,
  once = true,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  delay?: number;
  as?: "div" | "section" | "ul" | "ol" | "article" | "header" | "footer";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));

    const run = () => {
      if (reduced) {
        targets.forEach((t) => (t.style.opacity = "1"));
        return;
      }
      if (targets.length) {
        animate(targets, {
          opacity: [0, 1],
          translateY: [18, 0],
          filter: ["blur(6px)", "blur(0px)"],
          duration: 800,
          delay: stagger(70, { start: delay }),
          ease: "outExpo",
        });
      }
      counters.forEach((el) => {
        const end = Number(el.dataset.count);
        if (!Number.isFinite(end)) return;
        const decimals = (el.dataset.count ?? "").split(".")[1]?.length ?? 0;
        const state = { v: 0 };
        animate(state, {
          v: end,
          duration: 1200,
          delay,
          ease: "outExpo",
          onUpdate: () => (el.textContent = state.v.toFixed(decimals)),
        });
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          if (once) io.disconnect();
        }
      },
      // threshold 0 + a small negative margin: fires as soon as any part is ~10% into the viewport,
      // which also works for groups taller than the viewport (a ratio threshold never would).
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [once, delay]);

  // Narrow to one intrinsic tag for typing; every allowed tag accepts the same props.
  const El = Tag as "div";
  return <El ref={ref as React.RefObject<HTMLDivElement>} className={className}>{children}</El>;
}
