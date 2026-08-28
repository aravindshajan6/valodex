"use client";

import { useCallback, useSyncExternalStore } from "react";

/** SSR-safe media query hook; the server (and hydration pass) always sees `false`. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

let webglCache: boolean | null = null;
const noop = () => () => {};
function readWebGL() {
  if (webglCache === null) {
    try {
      const c = document.createElement("canvas");
      webglCache = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

/** Whether the browser can create a WebGL context. `false` on the server. */
export function useWebGL() {
  return useSyncExternalStore(noop, readWebGL, () => false);
}
