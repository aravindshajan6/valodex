"use client";

import { useCursor, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import type { LadderTier } from "./types";

/* ---- Layout constants -------------------------------------------------- */
const RADIUS = 3.4;
const STEP_Y = 0.34;
const STEP_A = 0.5;
const INK = "#0f1923";
const HOLO = "#41e0c2";
const RED = "#ff4655";
const HOME_POS = new THREE.Vector3(0, 1.6, 15.5);
const HOME_LOOK = new THREE.Vector3(0, 0.2, 0);

export type RankSceneProps = {
  tiers: LadderTier[];
  activeIndex: number | null;
  hoveredIndex: number | null;
  onSelect: (index: number | null) => void;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Valorant's signature chamfer: only the top-right and bottom-left corners are cut. */
function plateGeometry(size = 1.05, cut = 0.18, depth = 0.09) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h, -h + cut);
  s.lineTo(-h + cut, -h);
  s.lineTo(h, -h);
  s.lineTo(h, h - cut);
  s.lineTo(h - cut, h);
  s.lineTo(-h, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

const plateY = (index: number, count: number) => (index - (count - 1) / 2) * STEP_Y;

function Plate({
  tier,
  index,
  count,
  texture,
  geometry,
  edges,
  active,
  hovered,
  reduced,
  onSelect,
}: {
  tier: LadderTier;
  index: number;
  count: number;
  texture?: THREE.Texture;
  geometry: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  active: boolean;
  hovered: boolean;
  reduced: boolean;
  onSelect: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const outline = useRef<THREE.LineBasicMaterial>(null);
  const [over, setOver] = useState(false);
  useCursor(over);

  const t = count > 1 ? index / (count - 1) : 1;
  const angle = index * STEP_A;
  const baseY = plateY(index, count);
  // Emissive climbs quadratically up the ladder so only the top tiers cross the bloom threshold.
  const baseEmissive = 0.08 + 0.75 * t * t;
  const color = useMemo(() => new THREE.Color(tier.color), [tier.color]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const k = reduced ? 40 : 6;
    const lit = hovered || over;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, active ? 1.35 : lit ? 1.12 : 1, k, d));
    const bob = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.8 + index * 0.7) * 0.05;
    g.position.y = baseY + bob;
    if (material.current) {
      const target = active ? baseEmissive + 0.6 : lit ? baseEmissive + 0.3 : baseEmissive;
      material.current.emissiveIntensity = THREE.MathUtils.damp(material.current.emissiveIntensity, target, k, d);
    }
    if (outline.current) outline.current.opacity = THREE.MathUtils.damp(outline.current.opacity, active ? 0.95 : lit ? 0.4 : 0, k, d);
  });

  return (
    <group ref={group} position={[Math.cos(angle) * RADIUS, baseY, Math.sin(angle) * RADIUS]} rotation={[0, Math.PI / 2 - angle, 0]}>
      <mesh
        geometry={geometry}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(index);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setOver(true);
        }}
        onPointerOut={() => setOver(false)}
      >
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={baseEmissive} metalness={0.55} roughness={0.35} />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[1.02, 1.02]} />
          <meshBasicMaterial map={texture} map-colorSpace={THREE.SRGBColorSpace} map-anisotropy={4} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <lineSegments geometry={edges} scale={1.16}>
        <lineBasicMaterial ref={outline} color={HOLO} transparent opacity={0} />
      </lineSegments>
    </group>
  );
}

function Helix({ tiers, activeIndex, hoveredIndex, onSelect, reduced }: RankSceneProps & { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const look = useRef(HOME_LOOK.clone());
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  const geometry = useMemo(() => plateGeometry(), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  useEffect(() => () => { geometry.dispose(); edges.dispose(); }, [geometry, edges]);

  const urls = useMemo(() => Array.from(new Set(tiers.map((t) => t.largeIcon ?? t.smallIcon).filter((u): u is string => Boolean(u)))), [tiers]);
  // Colour space / anisotropy are applied declaratively on the material (`map-colorSpace`), never by mutating the texture.
  const loaded = useTexture(urls);
  const textures = useMemo(() => new Map(urls.map((u, i) => [u, loaded[i]])), [urls, loaded]);

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const k = reduced ? 40 : 3.2;
    let pos = HOME_POS;
    let lookAt = HOME_LOOK;

    if (activeIndex == null) {
      if (!reduced) g.rotation.y += d * 0.12;
    } else {
      // Rotate the helix so the chosen plate faces +z (the camera); pick the nearest full turn.
      const base = activeIndex * STEP_A - Math.PI / 2;
      const turns = Math.round((g.rotation.y - base) / (Math.PI * 2));
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, base + turns * Math.PI * 2, k, d);
      const y = plateY(activeIndex, tiers.length);
      pos = tmpPos.current.set(0.55, y + 0.5, RADIUS + 4.6);
      lookAt = tmpLook.current.set(0, y, RADIUS * 0.7);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, k, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, k, d);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, k, d);
    look.current.x = THREE.MathUtils.damp(look.current.x, lookAt.x, k, d);
    look.current.y = THREE.MathUtils.damp(look.current.y, lookAt.y, k, d);
    look.current.z = THREE.MathUtils.damp(look.current.z, lookAt.z, k, d);
    camera.lookAt(look.current);
  });

  return (
    <group ref={group}>
      {tiers.map((tier, i) => (
        <Plate
          key={tier.tier}
          tier={tier}
          index={i}
          count={tiers.length}
          texture={textures.get(tier.largeIcon ?? tier.smallIcon ?? "")}
          geometry={geometry}
          edges={edges}
          active={activeIndex === i}
          hovered={hoveredIndex === i}
          reduced={reduced}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/** Deterministic PRNG (mulberry32) so the ember field is pure across renders. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Slow-rising holo embers around the helix. Frozen under reduced motion. */
function Embers({ count = 240, reduced }: { count?: number; reduced: boolean }) {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const rand = seeded(0x5a1f);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + rand() * 3.6;
      const a = rand() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (rand() - 0.5) * 9;
      positions[i * 3 + 2] = Math.sin(a) * r;
      speeds[i] = 0.15 + rand() * 0.35;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, dt) => {
    const p = points.current;
    if (!p || reduced) return;
    const attr = p.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speeds[i] * dt;
      if (y > 4.5) y = -4.5;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={HOLO} transparent opacity={0.65} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export default function RankScene(props: RankSceneProps) {
  const reduced = useReducedMotion();
  return (
    <SceneCanvas camera={{ position: HOME_POS.toArray(), fov: 34 }} onPointerMissed={() => props.onSelect(null)}>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 14, 26]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 8, 6]} intensity={1.8} />
      <pointLight position={[-5, -3, 4]} intensity={40} color={RED} distance={16} />
      <pointLight position={[5, 4, -3]} intensity={30} color={HOLO} distance={16} />
      <Helix {...props} reduced={reduced} />
      <Embers reduced={reduced} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.72} luminanceSmoothing={0.25} mipmapBlur intensity={0.7} />
      </EffectComposer>
    </SceneCanvas>
  );
}
