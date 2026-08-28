"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";

/** If a scene throws (no WebGL, context lost, bad texture) render nothing and let the DOM fallback show. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Standard R3F canvas: transparent, capped DPR, no shadows by default.
 * Always import this via a `.lazy.tsx` wrapper (see `Scene3D`) so three never runs on the server.
 *
 * Mount the canvas in the same commit as its container. Gating it behind a state flag that
 * turns on *after* hydration can leave the canvas unmeasured (0x0), and R3F then never
 * renders the scene — pair it with a DOM fallback instead of a gate.
 */
export function SceneCanvas({ children, className, camera, ...rest }: CanvasProps & { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  // A canvas mounted after hydration (behind a WebGL probe, a 2D/3D toggle, a media query)
  // can be measured before layout settles and stay 0x0 forever, in which case R3F never
  // renders the scene. Nudge react-use-measure once the element is laid out.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = requestAnimationFrame(function tick() {
      if (el.clientWidth > 0 && el.clientHeight > 0) window.dispatchEvent(new Event("resize"));
      else raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={host} className={className ?? "absolute inset-0"}>
      <SceneBoundary>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={camera ?? { position: [0, 0, 6], fov: 45 }}
          {...rest}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
