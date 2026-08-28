"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { BufferGeometry, Color, Float32BufferAttribute, Vector3, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import type { HitLocation, TtkShot } from "@/lib/ttk";
import { HIT_COLORS } from "./hitColors";

export type RangeVisualizerProps = {
  /** Metres to the dummy. */
  distance: number;
  /** Hitboxes to highlight. */
  zones: HitLocation[];
  /** Timeline of the focused weapon; played back when `sequence` changes. */
  shots: TtkShot[];
  /** Increment to fire. 0 = idle. */
  sequence: number;
  reduced: boolean;
};

const S = 0.3; // scene units per metre
const MAX_M = 50;
const MUZZLE = new Vector3(0.5, 1.25, 0.6);
const ZONE_Y: Record<HitLocation, number> = { head: 1.62, body: 1.05, leg: 0.42 };
const TRAVEL = 0.05; // s for a tracer to reach the dummy
const TRACER_LIFE = 0.14; // s a tracer lingers after impact
const FLASH_LIFE = 0.2;

/** `t` is absolute `clock.elapsedTime` so Dummy and Volley agree without sharing a start time. */
type Flash = { t: number; location: HitLocation };

function Rig({ distance }: { distance: number }) {
  const camera = useThree((s) => s.camera);
  const want = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(0, 0.9, -1), []);
  const wantLook = useMemo(() => new Vector3(), []);
  useFrame((_, dt) => {
    const L = (Math.max(2, distance) * S) / 2;
    want.set(2.4 + L * 0.55, 1.8 + L * 0.3, -L + 3.2 + L * 1.15);
    wantLook.set(0, 0.9, -L);
    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(want, k);
    look.lerp(wantLook, k);
    camera.lookAt(look);
  });
  return null;
}

/** Dark corridor: floor, metre grid, wall strips and 5 m markers. */
function Corridor() {
  const len = (MAX_M + 4) * S;
  const grid = useMemo(() => {
    const pts: number[] = [];
    const halfW = 3;
    for (let m = -2; m <= MAX_M + 2; m++) pts.push(-halfW, 0, -m * S, halfW, 0, -m * S);
    for (let x = -halfW; x <= halfW; x += S * 2) pts.push(x, 0, 2 * S, x, 0, -(MAX_M + 2) * S);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);
  const markers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -len / 2 + 2 * S]}>
        <planeGeometry args={[6.2, len + 2]} />
        <meshStandardMaterial color="#0b131b" roughness={0.9} metalness={0.25} />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.002, 0]}>
        <lineBasicMaterial color="#263544" transparent opacity={0.9} />
      </lineSegments>
      {[-3.1, 3.1].map((x) => (
        <group key={x} position={[x, 0, -len / 2 + 2 * S]}>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[0.2, 2.6, len + 2]} />
            <meshStandardMaterial color="#131e2a" roughness={0.8} />
          </mesh>
          <mesh position={[x < 0 ? 0.11 : -0.11, 2.6, 0]}>
            <boxGeometry args={[0.02, 0.02, len + 2]} />
            <meshBasicMaterial color={new Color("#41e0c2").multiplyScalar(1.6)} toneMapped={false} />
          </mesh>
          <mesh position={[x < 0 ? 0.11 : -0.11, 0.05, 0]}>
            <boxGeometry args={[0.02, 0.02, len + 2]} />
            <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(0.9)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {markers.map((m) => (
        <group key={m} position={[0, 0, -m * S]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <planeGeometry args={[6, 0.03]} />
            <meshBasicMaterial color={m % 10 === 0 ? "#41e0c2" : "#3a4c5e"} transparent opacity={m % 10 === 0 ? 0.7 : 0.6} toneMapped={false} />
          </mesh>
          {m % 10 === 0 && (
            <Html position={[-2.7, 0.06, 0]} center distanceFactor={9} className="pointer-events-none select-none whitespace-nowrap font-mono text-[11px] tracking-[0.25em] text-holo/80">
              {m} M
            </Html>
          )}
        </group>
      ))}
      <mesh position={MUZZLE.toArray()}>
        <boxGeometry args={[0.12, 0.12, 0.5]} />
        <meshStandardMaterial color="#1b2836" emissive="#ff4655" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** Stylised target dummy with head/body/leg zones. The active zones glow; hits spike the glow. */
function Dummy({ z, zones, flashRef }: { z: number; zones: HitLocation[]; flashRef: React.RefObject<Flash | null> }) {
  const mats = useRef<Partial<Record<HitLocation, MeshStandardMaterial>>>({});
  useFrame(({ clock }) => {
    const f = flashRef.current;
    for (const loc of ["head", "body", "leg"] as HitLocation[]) {
      const m = mats.current[loc];
      if (!m) continue;
      const base = zones.includes(loc) ? 0.9 : 0.12;
      let spike = 0;
      if (f && f.location === loc) {
        const age = clock.elapsedTime - f.t;
        if (age >= 0 && age < FLASH_LIFE) spike = 3.5 * (1 - age / FLASH_LIFE);
      }
      m.emissiveIntensity = base + spike;
    }
  });
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, ZONE_Y.head, 0]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) mats.current.head = m;
          }}
          color="#1b2836"
          emissive={HIT_COLORS.head}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, ZONE_Y.body, 0]}>
        <capsuleGeometry args={[0.23, 0.5, 6, 20]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) mats.current.body = m;
          }}
          color="#1b2836"
          emissive={HIT_COLORS.body}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, ZONE_Y.leg, 0]}>
          <capsuleGeometry args={[0.1, 0.55, 6, 16]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) mats.current.leg = m;
            }}
            color="#1b2836"
            emissive={HIT_COLORS.leg}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[0.5, 0.55, 48]} />
        <meshBasicMaterial color={new Color("#41e0c2").multiplyScalar(1.4)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Plays the shot timeline: tracers streak to the dummy, a flash pops on impact. */
function Volley({
  shots,
  sequence,
  reduced,
  targetZ,
  flashRef,
  onLanded,
}: {
  shots: TtkShot[];
  sequence: number;
  reduced: boolean;
  targetZ: number;
  flashRef: React.RefObject<Flash | null>;
  onLanded: (n: number) => void;
}) {
  const seqRef = useRef(0);
  const start = useRef<number | null>(null);
  const landed = useRef(0);
  const tracers = useRef<Array<Mesh | null>>([]);
  const flashMesh = useRef<Mesh>(null);
  const end = useMemo(() => new Vector3(), []);
  const colors = useMemo(
    () => Object.fromEntries((["head", "body", "leg"] as HitLocation[]).map((l) => [l, new Color(HIT_COLORS[l]).multiplyScalar(3.2)])) as Record<HitLocation, Color>,
    [],
  );

  useFrame(({ clock }) => {
    if (seqRef.current !== sequence) {
      seqRef.current = sequence;
      start.current = clock.elapsedTime;
      landed.current = 0;
      flashRef.current = null;
      onLanded(0);
      if (reduced) {
        landed.current = shots.length;
        onLanded(shots.length);
      }
    }
    if (start.current == null) return;
    const now = clock.elapsedTime - start.current;

    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const m = tracers.current[i];
      const f = now - s.timeSeconds;
      if (m) {
        const visible = !reduced && f >= 0 && f < TRAVEL + TRACER_LIFE;
        m.visible = visible;
        if (visible) {
          end.set(0, ZONE_Y[s.location], targetZ + 0.2);
          const p = Math.min(1, f / TRAVEL);
          m.position.lerpVectors(MUZZLE, end, p);
          m.lookAt(end);
          (m.material as MeshBasicMaterial).opacity = f < TRAVEL ? 1 : 1 - (f - TRAVEL) / TRACER_LIFE;
        }
      }
      if (!reduced && f >= TRAVEL && i >= landed.current) {
        landed.current = i + 1;
        flashRef.current = { t: clock.elapsedTime, location: s.location };
        onLanded(landed.current);
      }
    }

    const fm = flashMesh.current;
    if (fm) {
      const fl = flashRef.current;
      const age = fl ? clock.elapsedTime - fl.t : Infinity;
      if (fl && age < FLASH_LIFE) {
        fm.visible = true;
        fm.position.set(0, ZONE_Y[fl.location], targetZ + 0.28);
        const k = age / FLASH_LIFE;
        fm.scale.setScalar(0.12 + k * 0.7);
        (fm.material as MeshBasicMaterial).opacity = 1 - k;
        (fm.material as MeshBasicMaterial).color.copy(colors[fl.location]);
      } else fm.visible = false;
    }
  });

  return (
    <>
      {shots.map((s, i) => (
        <mesh
          key={`${sequence}-${i}`}
          visible={false}
          ref={(el) => {
            tracers.current[i] = el;
          }}
        >
          <boxGeometry args={[0.03, 0.03, 1.1]} />
          <meshBasicMaterial color={colors[s.location]} transparent toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={flashMesh} visible={false}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

function Popup({ shot, z, index, reduced }: { shot: TtkShot; z: number; index: number; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-46px)", opacity: 0 }], { duration: 1100, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" });
  }, [reduced]);
  const dead = shot.healthAfter <= 0;
  return (
    <Html position={[0.55, ZONE_Y[shot.location] + 0.25 + (index % 3) * 0.12, z]} center zIndexRange={[20, 0]} className="pointer-events-none select-none">
      <div ref={ref} className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums" style={{ color: dead ? "#ece8e1" : HIT_COLORS[shot.location], textShadow: "0 0 12px rgba(0,0,0,0.9)" }}>
        {dead ? "☠ " : "−"}
        {Math.round(shot.rawDamage)}
      </div>
    </Html>
  );
}

export default function RangeVisualizerScene({ distance, zones, shots, sequence, reduced }: RangeVisualizerProps) {
  const targetZ = -Math.max(0.5, distance) * S;
  const flashRef = useRef<Flash | null>(null);
  const [landed, setLanded] = useState(0);
  const popups = reduced ? shots.slice(Math.max(0, shots.length - 1)) : shots.slice(Math.max(0, landed - 5), landed);

  return (
    <SceneCanvas camera={{ position: [3.5, 2.6, 5], fov: 42 }} className="absolute inset-0">
      <color attach="background" args={["#0f1923"]} />
      <fog attach="fog" args={["#0f1923", 12, 34]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 3, 1.5]} intensity={18} color="#ece8e1" distance={14} />
      <pointLight position={[0, 2.6, targetZ + 1.6]} intensity={30} color="#41e0c2" distance={10} />
      <Rig distance={distance} />
      <Corridor />
      <Dummy z={targetZ} zones={zones} flashRef={flashRef} />
      <Volley shots={shots} sequence={sequence} reduced={reduced} targetZ={targetZ} flashRef={flashRef} onLanded={setLanded} />
      {sequence > 0 && popups.map((s) => <Popup key={`${sequence}-${s.index}`} shot={s} z={targetZ} index={s.index} reduced={reduced} />)}
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1} luminanceSmoothing={0.15} />
      </EffectComposer>
    </SceneCanvas>
  );
}
