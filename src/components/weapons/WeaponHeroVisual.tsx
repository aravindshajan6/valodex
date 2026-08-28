"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import WeaponShowcaseScene from "./WeaponShowcaseScene.lazy";

/**
 * Hero visual: the 3D showcase when WebGL is available, with the plain weapon
 * image underneath until the first frame lands (and forever if WebGL is missing).
 */
export function WeaponHeroVisual({ icon, name }: { icon: string; name: string }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="absolute inset-0">
      <WeaponShowcaseScene icon={icon} onReady={() => setReady(true)} />
      <div
        aria-hidden={ready}
        className={cn("bg-grid absolute inset-0 flex items-center justify-center transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")}
      >
        <Image
          src={icon}
          alt={`${name}, side view`}
          width={1200}
          height={400}
          priority
          sizes="(min-width: 1024px) 60vw, 92vw"
          className="h-auto w-[82%] max-w-4xl object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
        />
      </div>
      {ready && <p className="sr-only">Interactive 3D showcase of the {name}.</p>}
    </div>
  );
}
