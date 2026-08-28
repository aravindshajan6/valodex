"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;
const noop = () => () => {};

function read(): boolean {
  if (cached === null) {
    try {
      const c = document.createElement("canvas");
      cached = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      cached = false;
    }
  }
  return cached;
}

/**
 * Whether the browser can create a WebGL context; `false` on the server.
 *
 * Use this to pick a *fallback*, never to gate the mount of a `<SceneCanvas>`:
 * this flips one commit after hydration, and a canvas mounted that late can be
 * measured at 0x0 and never render. Mount the canvas and layer the fallback under it.
 */
export function useWebGL(): boolean {
  return useSyncExternalStore(noop, read, () => false);
}
