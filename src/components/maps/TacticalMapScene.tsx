"use client";

import { Grid, Html, OrbitControls, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react";
import { AdditiveBlending, SRGBColorSpace, Vector3, type Mesh, type MeshBasicMaterial } from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { superRegionColor, type ProjectedCallout } from "@/lib/minimap";
import { useReducedMotion } from "./useMedia";

export type TacticalMapSceneProps = {
  icon: string;
  callouts: ProjectedCallout[];
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
};

/** World size of the minimap plane. */
const SIZE = 10;
const INK = "#0f1923";
const HOLO = "#41e0c2";

const uvToWorld = (u: number, v: number, h = 0) => new Vector3((u - 0.5) * SIZE, h, (v - 0.5) * SIZE);
/** Pin height: a floor of 0.3 so every pin clears the plane, plus up to 1.1 for the highest callout. */
const pinHeight = (zNorm: number) => 0.3 + zNorm * 1.1;

type Controls = ComponentRef<typeof OrbitControls>;

function MapPlane({ icon }: { icon: string }) {
  const tex = useTexture(icon, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
  });
  return (
    <group>
      {/* holo rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[SIZE * 1.1, SIZE * 1.1]} />
        <meshBasicMaterial color={HOLO} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {/* dark slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
        <planeGeometry args={[SIZE * 1.07, SIZE * 1.07]} />
        <meshStandardMaterial color="#131e2a" roughness={0.95} metalness={0.1} />
      </mesh>
      {/* minimap */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} color="#a6b6c4" transparent alphaTest={0.02} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Sweep({ reduced }: { reduced: boolean }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    const rings = [a.current, b.current];
    if (reduced) {
      rings.forEach((m, i) => {
        if (!m) return;
        m.scale.setScalar(SIZE * (0.25 + i * 0.2));
        (m.material as MeshBasicMaterial).opacity = 0.2;
      });
      return;
    }
    phase.current = (phase.current + dt / 3.8) % 1;
    rings.forEach((m, i) => {
      if (!m) return;
      const p = (phase.current + i * 0.5) % 1;
      m.scale.setScalar(0.2 + p * SIZE * 0.74);
      (m.material as MeshBasicMaterial).opacity = (1 - p) * 0.55;
    });
  });
  const ring = (ref: RefObject<Mesh | null>) => (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <ringGeometry args={[0.965, 1, 128]} />
      <meshBasicMaterial color={HOLO} transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
  return (
    <>
      {ring(a)}
      {ring(b)}
    </>
  );
}

function Pin({ c, active, onHover, onSelect }: { c: ProjectedCallout; active: boolean; onHover: (id: number | null) => void; onSelect: (id: number | null) => void }) {
  const h = pinHeight(c.zNorm);
  const pos = useMemo(() => uvToWorld(c.u, c.v), [c.u, c.v]);
  const color = superRegionColor(c.superRegion);
  const head = useRef<Mesh>(null);
  useFrame((_, dt) => {
    const m = head.current;
    if (!m) return;
    const target = active ? 1.7 : 1;
    m.scale.setScalar(m.scale.x + (target - m.scale.x) * Math.min(1, dt * 10));
  });
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.09, 0.14, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.011, 0.011, h, 6]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.35} />
      </mesh>
      <mesh ref={head} position={[0, h, 0]}>
        <sphereGeometry args={[0.1, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 3.2 : 1.3} toneMapped={false} />
      </mesh>
      {/* generous invisible hit target */}
      <mesh
        position={[0, h, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(c.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(c.id);
        }}
      >
        <sphereGeometry args={[0.34, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active && (
        <Html position={[0, h + 0.32, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div className="chamfer-sm whitespace-nowrap border bg-ink/90 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ borderColor: color, color }}>
            <span className="text-bone-2">{c.superRegionName}</span> <span className="mx-1 text-mute">/</span> {c.name}
            <span className="ml-2 text-mute">z {Math.round(c.z)}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Eases the orbit target toward the selected pin (or back to centre). */
function Rig({ controls, target }: { controls: RefObject<Controls | null>; target: Vector3 | null }) {
  const desired = useMemo(() => target ?? new Vector3(0, 0, 0), [target]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    c.target.lerp(desired, 1 - Math.exp(-dt * 4));
  });
  return null;
}

export default function TacticalMapScene({ icon, callouts, hoveredId, selectedId, onHover, onSelect }: TacticalMapSceneProps) {
  const reduced = useReducedMotion();
  const controls = useRef<Controls>(null);
  const selected = callouts.find((c) => c.id === selectedId) ?? null;
  const target = useMemo(() => (selected ? uvToWorld(selected.u, selected.v, pinHeight(selected.zNorm) * 0.5) : null), [selected]);

  useEffect(() => {
    document.body.style.cursor = hoveredId !== null ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredId]);

  return (
    <SceneCanvas camera={{ position: [0, 8.5, 9.5], fov: 38, near: 0.1, far: 80 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 14, 34]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} color="#c9d6e2" />
      <pointLight position={[-6, 5, -6]} intensity={14} color={HOLO} distance={30} />
      <Grid
        position={[0, -0.07, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#263544"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#2f4256"
        fadeDistance={26}
        fadeStrength={1.6}
        infiniteGrid
      />
      <MapPlane icon={icon} />
      <Sweep reduced={reduced} />
      {callouts.map((c) => (
        <Pin key={c.id} c={c} active={c.id === hoveredId || c.id === selectedId} onHover={onHover} onSelect={onSelect} />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.12}
        autoRotate={!reduced && hoveredId === null && selectedId === null}
        autoRotateSpeed={0.35}
      />
      <Rig controls={controls} target={target} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.85} mipmapBlur intensity={0.75} radius={0.55} />
      </EffectComposer>
    </SceneCanvas>
  );
}
