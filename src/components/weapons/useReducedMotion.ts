"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** `true` when the client reports `prefers-reduced-motion: reduce`. Server render: `false`. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(QUERY).matches, () => false);
}

let webglCached: boolean | null = null;
function webglSnapshot(): boolean {
  if (webglCached == null) {
    try {
      const c = document.createElement("canvas");
      webglCached = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webglCached = false;
    }
  }
  return webglCached;
}
const subscribeNever = () => () => {};

/** `null` on the server render, then whether a WebGL context can be created. */
export function useWebGL(): boolean | null {
  return useSyncExternalStore(subscribeNever, webglSnapshot, () => null);
}
