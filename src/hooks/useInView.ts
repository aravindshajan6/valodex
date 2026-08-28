"use client";

import { useEffect, useRef, useState } from "react";

/** Whether an element is on screen — used to pause a canvas' frameloop when scrolled away. */
export function useInView<T extends HTMLElement>(threshold = 0.02) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}
