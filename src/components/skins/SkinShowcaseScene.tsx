"use client";

import { MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { useInView, useReducedMotion } from "./useReducedMotion";

/**
 * Skin detail hero: the chroma render as a texture on a plane floating over a
 * reflective floor, haloed in the tier colour. Chroma changes crossfade between
 * two planes; the old one only fades once the new texture has loaded.
 */
export type SkinShowcaseSceneProps = { url: string; color: string; sparkle: boolean };

const SLAB_Y = 0.15;
const FLOOR_Y = -1.45;

function Slab({ id, url, active, z, width, onReady }: { id: number; url: string; active: boolean; z: number; width: number; onReady: (id: number) => void }) {
  const tex = useLoader(THREE.TextureLoader, url);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  // Runs after Suspense resolves, i.e. once the texture is actually loaded.
  useEffect(() => { onReady(id); }, [onReady, id]);
  const img = tex.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 3;
  useFrame((_, dt) => {
    if (mat.current) mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, active ? 1 : 0, 7, dt);
  });
  return (
    <mesh position={[0, SLAB_Y, z]}>
      <planeGeometry args={[width, width / aspect]} />
      {/* Pierced props configure the cached texture declaratively (sRGB PNG, sharper at grazing angles). */}
      <meshBasicMaterial ref={mat} map={tex} map-colorSpace={THREE.SRGBColorSpace} map-anisotropy={8} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

type Layer = { url: string; id: number };

function Slabs({ url }: { url: string }) {
  const { viewport } = useThree();
  const width = Math.min(viewport.width * 0.82, 5.4);
  const [layers, setLayers] = useState<Layer[]>(() => [{ url, id: 0 }]);
  const [readyId, setReadyId] = useState(0);
  const latest = layers[layers.length - 1];
  if (latest.url !== url) setLayers([...layers, { url, id: latest.id + 1 }]);

  // Once the newest layer has its texture, drop the older ones after the fade.
  useEffect(() => {
    if (layers.length <= 1 || readyId !== latest.id) return;
    const tm = setTimeout(() => setLayers((ls) => ls.slice(-1)), 800);
    return () => clearTimeout(tm);
  }, [readyId, layers.length, latest.id]);

  const onReady = useCallback((id: number) => setReadyId((r) => Math.max(r, id)), []);

  return (
    <>
      {layers.map((l, i) => {
        const isLatest = i === layers.length - 1;
        const active = isLatest || readyId < latest.id;
        return (
          <Suspense key={l.id} fallback={null}>
            <Slab id={l.id} url={l.url} active={active} z={i * 0.012} width={width} onReady={onReady} />
          </Suspense>
        );
      })}
    </>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

/** Soft radial halo in the tier colour, rendered behind the skin plane. */
function Halo({ color }: { color: string }) {
  const tex = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const [r, g, b] = hexToRgb(color);
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},0.28)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={[0, SLAB_Y, -0.7]}>
      <planeGeometry args={[8, 4.5]} />
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.6} toneMapped={false} />
    </mesh>
  );
}

function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const idleY = reduced ? 0 : Math.sin(t * 0.45) * 0.14;
    const idleX = reduced ? 0 : Math.sin(t * 0.3) * 0.04;
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, idleY + state.pointer.x * 0.38, 3, dt);
    g.current.rotation.x = THREE.MathUtils.damp(g.current.rotation.x, idleX - state.pointer.y * 0.2, 3, dt);
    g.current.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.06;
  });
  return <group ref={g}>{children}</group>;
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y}>
      <planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial
        blur={[320, 90]}
        resolution={768}
        mixBlur={1}
        mixStrength={30}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#0b131b"
        metalness={0.45}
        mirror={0.55}
      />
    </mesh>
  );
}

export default function SkinShowcaseScene({ url, color, sparkle }: SkinShowcaseSceneProps) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      <SceneCanvas camera={{ position: [0, 0.45, 7.5], fov: 38 }} frameloop={inView ? "always" : "never"}>
        <color attach="background" args={["#0f1923"]} />
        <fog attach="fog" args={["#0f1923", 10, 22]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 1.6, -2.2]} color={color} intensity={40} distance={14} />
        <pointLight position={[-3, -0.5, 2]} color={color} intensity={12} distance={10} />
        <spotLight position={[3, 5, 4]} intensity={35} angle={0.6} penumbra={1} color="#ffffff" />
        <Rig reduced={reduced}>
          <Halo color={color} />
          <Slabs url={url} />
        </Rig>
        {sparkle && <Sparkles count={110} scale={[7.5, 3.6, 3]} size={2.6} speed={reduced ? 0 : 0.35} color={color} opacity={0.7} position={[0, 0.4, 0]} />}
        <Floor />
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.72} luminanceSmoothing={0.25} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  );
}
