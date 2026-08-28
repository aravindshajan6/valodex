"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Suspense } from "react";

/**
 * Standard R3F canvas: transparent, capped DPR, no shadows by default.
 * Always import this via `next/dynamic` with `ssr: false` from server components
 * (see `Scene3D` below) so three never runs on the server.
 */
export function SceneCanvas({ children, className, camera, ...rest }: CanvasProps & { className?: string }) {
  return (
    <div className={className ?? "absolute inset-0"}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={camera ?? { position: [0, 0, 6], fov: 45 }}
        {...rest}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
