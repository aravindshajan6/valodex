"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Client-only lazy mount for a 3D scene. Next forbids `ssr: false` dynamic imports
 * inside server components, so each scene gets a sibling `Foo.lazy.tsx`:
 *
 *   "use client";
 *   import { lazyScene } from "@/components/three/Scene3D";
 *   export default lazyScene(() => import("./FooScene"));
 *
 * Server pages then import and render the `.lazy` module. Nothing from three
 * ever runs on the server, and the page never blocks on the three chunk.
 */
export function lazyScene<P extends object>(loader: () => Promise<{ default: ComponentType<P> }>) {
  return dynamic(loader, { ssr: false, loading: () => null });
}
