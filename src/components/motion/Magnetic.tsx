"use client";

import { animate } from "animejs";
import { useRef } from "react";

/** Element that leans toward the cursor and snaps back — for CTAs and icon buttons. */
export function Magnetic({ children, strength = 0.35, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    animate(el, { translateX: x, translateY: y, duration: 300, ease: "outQuad" });
  };
  const onLeave = () => ref.current && animate(ref.current, { translateX: 0, translateY: 0, duration: 700, ease: "outElastic(1, .5)" });
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={className}>
      {children}
    </div>
  );
}
