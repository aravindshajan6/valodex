"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import HoloCardScene from "./HoloCardScene.lazy";
import { cardGradient, agentPalette, withAlpha } from "./gradient";

type Props = {
  name: string;
  portrait: string | null;
  background: string | null;
  gradientColors: string[] | null;
  rightFacing: boolean;
};

let webglSupport: boolean | null = null;
/** Probe WebGL once per session; SSR and no-WebGL clients keep the DOM card. */
function hasWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

/**
 * Holographic agent card. Renders a DOM card (gradient + texture + portrait)
 * immediately — it is the no-WebGL / no-JS fallback and the loading state —
 * and fades it out once the Three.js scene has its textures.
 */
export function AgentHologram({ name, portrait, background, gradientColors, rightFacing }: Props) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const [ready, setReady] = useState(false);
  const palette = agentPalette(gradientColors);

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[560px]">
      {/* Ambient glow behind the card, in the agent's colours. */}
      <div
        aria-hidden
        className="absolute inset-[-12%] -z-10 blur-3xl"
        style={{ background: `radial-gradient(50% 50% at 50% 50%, ${withAlpha(palette.accent, 0.35)} 0%, transparent 70%)` }}
      />

      {/* DOM fallback card. */}
      <div
        aria-hidden={ready}
        className={cn("absolute inset-[6%] transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")}
      >
        <div className="chamfer absolute inset-0 border border-line" style={{ backgroundImage: cardGradient(palette) }}>
          {background && <Image src={background} alt="" fill sizes="(min-width: 1024px) 560px, 90vw" className="object-cover opacity-50 mix-blend-soft-light" />}
          <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: palette.glow, boxShadow: `0 0 16px ${withAlpha(palette.glow, 0.8)}` }} />
        </div>
        {portrait && (
          <div className="absolute inset-x-[-4%] -top-[10%] bottom-[4%]">
            <Image
              src={portrait}
              alt={`${name} portrait`}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 90vw"
              className={cn("object-contain object-bottom drop-shadow-[0_30px_40px_rgba(0,0,0,0.7)]", rightFacing && "-scale-x-100")}
            />
          </div>
        )}
      </div>

      {webgl && portrait && (
        <HoloCardScene
          portrait={portrait}
          background={background}
          primary={palette.primary}
          accent={palette.accent}
          glow={palette.glow}
          rightFacing={rightFacing}
          onReady={() => setReady(true)}
        />
      )}
    </div>
  );
}
