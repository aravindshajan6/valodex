"use client";

import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { useInView, useReducedMotion } from "@/hooks";

/**
 * /skins hero background: a slow drifting field of translucent chamfered "card"
 * planes, each edged in a content-tier colour and pushed over the bloom threshold.
 */

const COUNT = 44;
const BOUNDS = { x: 11, y: 5, zMin: -7, zMax: 1.5 };

type Card = { pos: THREE.Vector3; rot: THREE.Euler; vel: THREE.Vector3; phase: number; scale: number; spin: number; tier: number };

/** Deterministic PRNG so the field looks the same on every mount. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chamferShape(w: number, h: number, c: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h / 2);
  s.lineTo(w / 2 - c, h / 2);
  s.lineTo(w / 2, h / 2 - c);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(-w / 2 + c, -h / 2);
  s.lineTo(-w / 2, -h / 2 + c);
  s.closePath();
  return s;
}

function Field({ colors }: { colors: string[] }) {
  const reduced = useReducedMotion();
  const group = useRef<THREE.Group>(null);

  const { fill, edge } = useMemo(() => {
    const shape = chamferShape(1.6, 1, 0.16);
    const fill = new THREE.ShapeGeometry(shape);
    const edge = new THREE.BufferGeometry().setFromPoints(shape.getPoints().map((p) => new THREE.Vector3(p.x, p.y, 0)));
    return { fill, edge };
  }, []);

  const fillMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#1b2836", transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const edgeMats = useMemo(
    () => colors.map((c) => new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.85 })),
    [colors],
  );
  const barMats = useMemo(
    () => colors.map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false })),
    [colors],
  );

  const cards = useMemo<Card[]>(() => {
    const rnd = mulberry32(1337);
    return Array.from({ length: COUNT }, (_, i) => ({
      pos: new THREE.Vector3((rnd() * 2 - 1) * BOUNDS.x, (rnd() * 2 - 1) * BOUNDS.y, BOUNDS.zMin + rnd() * (BOUNDS.zMax - BOUNDS.zMin)),
      rot: new THREE.Euler((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 0.3),
      vel: new THREE.Vector3(0.12 + rnd() * 0.25, (rnd() - 0.5) * 0.08, 0),
      phase: rnd() * Math.PI * 2,
      scale: 0.55 + rnd() * 0.9,
      spin: (rnd() - 0.5) * 0.12,
      // Bias toward the rarer tiers so the field reads gold/red rather than blue.
      tier: Math.min(colors.length - 1, Math.floor(Math.pow(rnd(), 0.7) * colors.length)) || i % colors.length,
    }));
  }, [colors.length]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const step = reduced ? 0 : Math.min(dt, 0.05);
    const time = reduced ? 0 : state.clock.elapsedTime;
    g.children.forEach((obj, i) => {
      const c = cards[i];
      if (!c) return;
      c.pos.addScaledVector(c.vel, step);
      if (c.pos.x > BOUNDS.x + 1.5) c.pos.x = -BOUNDS.x - 1.5;
      if (c.pos.y > BOUNDS.y + 1) c.pos.y = -BOUNDS.y - 1;
      if (c.pos.y < -BOUNDS.y - 1) c.pos.y = BOUNDS.y + 1;
      obj.position.set(c.pos.x, c.pos.y + Math.sin(time * 0.5 + c.phase) * 0.25, c.pos.z);
      obj.rotation.set(c.rot.x + Math.sin(time * 0.3 + c.phase) * 0.08, c.rot.y + time * c.spin, c.rot.z);
    });
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.06, 2, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.04, 2, dt);
  });

  return (
    <group ref={group}>
      {cards.map((c, i) => (
        <group key={i} scale={c.scale} position={c.pos} rotation={c.rot}>
          <mesh geometry={fill} material={fillMat} />
          <lineLoop geometry={edge} material={edgeMats[c.tier]} />
          {/* tier hairline along the top edge, like the DOM cards */}
          <mesh position={[-0.12, 0.44, 0.002]} material={barMats[c.tier]}>
            <planeGeometry args={[1.1, 0.018]} />
          </mesh>
          <mesh position={[0.62, -0.36, 0.002]} material={barMats[c.tier]}>
            <planeGeometry args={[0.09, 0.09]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function SkinFieldScene({ colors }: { colors: string[] }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const palette = colors.length ? colors : ["#41e0c2"];
  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      <SceneCanvas camera={{ position: [0, 0, 8], fov: 40 }} frameloop={inView ? "always" : "never"}>
        <color attach="background" args={["#0f1923"]} />
        <fog attach="fog" args={["#0f1923", 5, 17]} />
        <Field colors={palette} />
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.5} luminanceSmoothing={0.3} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  );
}
