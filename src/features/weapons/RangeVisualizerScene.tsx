"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Fog,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PerspectiveCamera,
} from "three";
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
const HALF_W = 3.6; // corridor half-width; the camera rides *inside* this
const WALL_H = 2.7;
const CEIL_H = 2.66;
/** The hall runs well behind the camera: parked past its end you see the wall's outer face. */
const Z_START = 9;
const Z_END = -(MAX_M + 4) * S;
const LEN = Z_START - Z_END;
const CZ = (Z_START + Z_END) / 2;
/** Deeper than the panel's ink so the lane reads as a recessed volume, not a flat fill. */
const BG = "#060b11";
const MUZZLE = new Vector3(2.72, 0.92, 1.1);
const ZONE_Y: Record<HitLocation, number> = { head: 1.62, body: 1.05, leg: 0.42 };
const TRAVEL = 0.07; // s for a tracer to reach the dummy
const TRACER_LIFE = 0.22; // s a tracer lingers after impact
const FLASH_LIFE = 0.28;

/** `t` is absolute `clock.elapsedTime` so Dummy and Volley agree without sharing a start time. */
type Flash = { t: number; location: HitLocation };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Frames the lane. The camera stays *inside* the corridor (|x| < HALF_W) — parked outside it
 * the near wall becomes an opaque slab across the frame — and zooms in as the dummy walks back
 * so it never shrinks below a readable size. Snaps on the first frame so a frozen clock
 * (reduced motion, headless capture) still gets the composed shot.
 */
function Rig({ distance, targetZ }: { distance: number; targetZ: number }) {
  const want = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(0, 1, -3.2), []);
  const wantLook = useMemo(() => new Vector3(), []);
  const dummy = useMemo(() => new Vector3(), []);
  const first = useRef(true);
  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const L = (clamp(distance, 6, MAX_M) * S) / 2;
    want.set(2.05, 1.24 + L * 0.1, Math.max(2.3 + L * 0.5, 6.0 - Math.abs(targetZ)));
    wantLook.set(0, 1.18, -L * 1.5);
    const k = first.current ? 1 : 1 - Math.exp(-Math.min(0.1, dt) * 3.2);
    first.current = false;
    camera.position.lerp(want, k);
    look.lerp(wantLook, k);
    camera.lookAt(look);

    // Telephoto at range: keeps the 50 m dummy about as tall as the 10 m one.
    const wantFov = 42 - 17 * clamp((distance - 5) / 40, 0, 1);
    if (Math.abs(camera.fov - wantFov) > 0.01) {
      camera.fov += (wantFov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }

    // Fog opens *past* the dummy so the lane fades into the dark without dimming the target.
    const fog = state.scene.fog;
    if (fog instanceof Fog) {
      const d = camera.position.distanceTo(dummy.set(0, 1, targetZ));
      fog.near = d * 1.05;
      fog.far = d * 1.05 + 7;
    }
  });
  return null;
}

/** Lit corridor: floor, metre grid, wall strips and 5 m markers. */
function Corridor({ distance }: { distance: number }) {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let m = Math.floor(-Z_START / S); m <= MAX_M + 4; m++) pts.push(-HALF_W, 0, -m * S, HALF_W, 0, -m * S);
    for (let x = -HALF_W; x <= HALF_W + 0.001; x += S * 2) pts.push(x, 0, Z_START, x, 0, Z_END);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);
  // Only mark the lane the shot actually travels — the whole 50 m of ticks piles up at the vanishing point.
  const markers = useMemo(
    () => Array.from({ length: MAX_M / 5 }, (_, i) => (i + 1) * 5).filter((m) => m <= distance + 6),
    [distance],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, CZ]}>
        <planeGeometry args={[HALF_W * 2, LEN]} />
        <meshStandardMaterial color="#1a2836" roughness={0.72} metalness={0.2} />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.004, 0]}>
        <lineBasicMaterial color="#4c6c85" transparent opacity={0.42} />
      </lineSegments>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * (HALF_W + 0.12), 0, CZ]}>
          <mesh position={[0, WALL_H / 2, 0]}>
            <boxGeometry args={[0.24, WALL_H, LEN]} />
            <meshStandardMaterial color="#22313f" roughness={0.85} metalness={0.1} />
          </mesh>
          {/* kick plate: catches the key light so the wall base reads against the floor */}
          <mesh position={[-side * 0.13, 0.22, 0]}>
            <boxGeometry args={[0.03, 0.44, LEN]} />
            <meshStandardMaterial color="#33475a" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[-side * 0.13, WALL_H - 0.06, 0]}>
            <boxGeometry args={[0.04, 0.05, LEN]} />
            <meshBasicMaterial color={new Color("#41e0c2").multiplyScalar(1.5)} toneMapped={false} />
          </mesh>
          <mesh position={[-side * 0.13, 0.06, 0]}>
            <boxGeometry args={[0.04, 0.05, LEN]} />
            <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(1.25)} toneMapped={false} />
          </mesh>
        </group>
      ))}

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEIL_H, CZ]}>
        <planeGeometry args={[HALF_W * 2 + 0.5, LEN]} />
        <meshStandardMaterial color="#16202b" roughness={0.95} metalness={0.05} />
      </mesh>
      {Array.from({ length: Math.ceil(LEN / 1.2) }, (_, i) => Z_START - 0.6 - i * 1.2).map((z) => (
        <mesh key={z} position={[0, CEIL_H - 0.04, z]}>
          <boxGeometry args={[1.35, 0.04, 0.06]} />
          <meshBasicMaterial color={new Color("#9fc4dd").multiplyScalar(0.45)} toneMapped={false} />
        </mesh>
      ))}

      {markers.map((m) => (
        <group key={m} position={[0, 0, -m * S]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
            <planeGeometry args={[HALF_W * 2, m % 10 === 0 ? 0.07 : 0.04]} />
            <meshBasicMaterial
              color={m % 10 === 0 ? new Color("#41e0c2").multiplyScalar(1.5) : new Color("#7d97ad")}
              transparent
              opacity={m % 10 === 0 ? 0.95 : 0.55}
              toneMapped={false}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (HALF_W - 0.16), m % 10 === 0 ? 0.16 : 0.09, 0]}>
              <boxGeometry args={[0.07, m % 10 === 0 ? 0.32 : 0.18, 0.05]} />
              <meshBasicMaterial
                color={m % 10 === 0 ? new Color("#41e0c2").multiplyScalar(1.5) : new Color("#5b7488")}
                toneMapped={false}
              />
            </mesh>
          ))}
          {m % 10 === 0 && (
            <Html
              position={[-HALF_W + 0.55, 0.42, 0]}
              center
              distanceFactor={9}
              className="pointer-events-none select-none whitespace-nowrap font-mono text-[11px] tracking-[0.25em] text-holo"
            >
              {m} M
            </Html>
          )}
        </group>
      ))}

      {/* firing line: the 0 m mark the shot leaves from */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <planeGeometry args={[HALF_W * 2, 0.08]} />
        <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(1.3)} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      {/* shooting bench, parked in the near corner so it frames the shot instead of blocking it */}
      <group position={[MUZZLE.x, 0, MUZZLE.z + 0.34]}>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[0.72, 0.7, 0.66]} />
          <meshStandardMaterial color="#243141" roughness={0.85} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.74, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.74]} />
          <meshStandardMaterial color="#2c3d4f" roughness={0.75} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 0.38]}>
          <boxGeometry args={[0.74, 0.04, 0.02]} />
          <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(1.2)} toneMapped={false} />
        </mesh>
      </group>
      <group position={MUZZLE.toArray()}>
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.09, 0.09, 0.42]} />
          <meshStandardMaterial color="#34465a" roughness={0.45} metalness={0.6} emissive="#ff4655" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, 0, -0.32]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(2.2)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Backstop behind the dummy: gives the silhouette something to read against at every range. */
function Backstop({ z }: { z: number }) {
  return (
    <group position={[0, 0, z - 0.85]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.9, 2.4, 0.14]} />
        <meshStandardMaterial color="#22303e" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, 2.42, 0.08]}>
        <boxGeometry args={[2.9, 0.05, 0.02]} />
        <meshBasicMaterial color={new Color("#41e0c2").multiplyScalar(2)} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.44, 1.2, 0.08]}>
          <boxGeometry args={[0.05, 2.4, 0.02]} />
          <meshBasicMaterial color={new Color("#ff4655").multiplyScalar(1.3)} toneMapped={false} />
        </mesh>
      ))}
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
      const base = zones.includes(loc) ? 1.15 : 0.45;
      let spike = 0;
      if (f && f.location === loc) {
        const age = clock.elapsedTime - f.t;
        if (age >= 0 && age < FLASH_LIFE) spike = 4 * (1 - age / FLASH_LIFE);
      }
      m.emissiveIntensity = base + spike;
    }
  });
  const zoneMat = (loc: HitLocation) => (
    <meshStandardMaterial
      ref={(m) => {
        if (m) mats.current[loc] = m;
      }}
      color="#33445a"
      emissive={HIT_COLORS[loc]}
      emissiveIntensity={zones.includes(loc) ? 1.15 : 0.45}
      roughness={0.45}
      metalness={0.25}
    />
  );
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, ZONE_Y.head, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        {zoneMat("head")}
      </mesh>
      <mesh position={[0, ZONE_Y.head - 0.24, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.16, 12]} />
        <meshStandardMaterial color="#2a3748" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, ZONE_Y.body, 0]}>
        <capsuleGeometry args={[0.25, 0.52, 6, 20]} />
        {zoneMat("body")}
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, ZONE_Y.leg, 0]}>
          <capsuleGeometry args={[0.105, 0.56, 6, 16]} />
          {zoneMat("leg")}
        </mesh>
      ))}
      {/* post + base plate */}
      <mesh position={[0, 0.06, -0.16]}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <meshStandardMaterial color="#2b3a4a" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <ringGeometry args={[0.5, 0.58, 48]} />
        <meshBasicMaterial color={new Color("#41e0c2").multiplyScalar(1.8)} toneMapped={false} transparent opacity={0.9} />
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
  const muzzleFlash = useRef<Mesh>(null);
  const end = useMemo(() => new Vector3(), []);
  const colors = useMemo(
    () =>
      Object.fromEntries(
        (["head", "body", "leg"] as HitLocation[]).map((l) => [l, new Color(HIT_COLORS[l]).multiplyScalar(5)]),
      ) as Record<HitLocation, Color>,
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

    let firing = false;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const m = tracers.current[i];
      const f = now - s.timeSeconds;
      if (f >= 0 && f < 0.05) firing = true;
      if (m) {
        const visible = !reduced && f >= 0 && f < TRAVEL + TRACER_LIFE;
        m.visible = visible;
        if (visible) {
          end.set(0, ZONE_Y[s.location], targetZ + 0.24);
          // Draw the whole streak, not a bullet: head-on, a travelling stub is a single pixel.
          const p = Math.min(1, f / TRAVEL);
          m.position.lerpVectors(MUZZLE, end, p / 2);
          m.lookAt(end);
          m.scale.set(1, 1, MUZZLE.distanceTo(end) * p);
          (m.material as MeshBasicMaterial).opacity = f < TRAVEL ? 1 : 1 - (f - TRAVEL) / TRACER_LIFE;
        }
      }
      if (!reduced && f >= TRAVEL && i >= landed.current) {
        landed.current = i + 1;
        flashRef.current = { t: clock.elapsedTime, location: s.location };
        onLanded(landed.current);
      }
    }

    const mf = muzzleFlash.current;
    if (mf) {
      mf.visible = !reduced && firing;
      if (mf.visible) mf.scale.setScalar(0.75 + Math.random() * 0.45);
    }

    const fm = flashMesh.current;
    if (fm) {
      const fl = flashRef.current;
      const age = fl ? clock.elapsedTime - fl.t : Infinity;
      if (fl && age < FLASH_LIFE) {
        fm.visible = true;
        fm.position.set(0, ZONE_Y[fl.location], targetZ + 0.3);
        const k = age / FLASH_LIFE;
        fm.scale.setScalar(0.4 + k * 1.4);
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
          <boxGeometry args={[0.055, 0.055, 1]} />
          <meshBasicMaterial color={colors[s.location]} transparent toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={muzzleFlash} visible={false} position={[MUZZLE.x, MUZZLE.y, MUZZLE.z - 0.36]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={new Color("#ffd27a").multiplyScalar(4)} toneMapped={false} transparent opacity={0.95} depthWrite={false} />
      </mesh>
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
    el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-46px)", opacity: 0 }], {
      duration: 1100,
      easing: "cubic-bezier(0.16,1,0.3,1)",
      fill: "forwards",
    });
  }, [reduced]);
  const dead = shot.healthAfter <= 0;
  return (
    <Html position={[0.55, ZONE_Y[shot.location] + 0.25 + (index % 3) * 0.12, z]} center zIndexRange={[20, 0]} className="pointer-events-none select-none">
      <div
        ref={ref}
        className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
        style={{ color: dead ? "#ece8e1" : HIT_COLORS[shot.location], textShadow: "0 0 12px rgba(0,0,0,0.9)" }}
      >
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
    <SceneCanvas camera={{ position: [2.05, 1.47, 3.42], fov: 40 }} className="absolute inset-0">
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 9, 18]} />
      <ambientLight intensity={0.9} color="#8fb3cc" />
      {/* key from the shooter's shoulder — rakes the floor grid and the near wall */}
      <directionalLight position={[5, 6, 6]} intensity={2.6} color="#ece8e1" />
      {/* cool fill down the lane so the far corridor doesn't go flat black */}
      <directionalLight position={[-6, 4, -8]} intensity={1.1} color="#41e0c2" />
      <pointLight position={[MUZZLE.x - 0.5, MUZZLE.y + 0.5, MUZZLE.z - 0.6]} intensity={2.6} color="#ff4655" distance={4} />
      <pointLight position={[0, 2.05, targetZ + 1.5]} intensity={11} color="#dcefff" distance={7} />
      <Rig distance={distance} targetZ={targetZ} />
      <Corridor distance={distance} />
      <Backstop z={targetZ} />
      <Dummy z={targetZ} zones={zones} flashRef={flashRef} />
      <Volley shots={shots} sequence={sequence} reduced={reduced} targetZ={targetZ} flashRef={flashRef} onLanded={setLanded} />
      {sequence > 0 && popups.map((s) => <Popup key={`${sequence}-${s.index}`} shot={s} z={targetZ} index={s.index} reduced={reduced} />)}
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1} luminanceSmoothing={0.15} />
      </EffectComposer>
    </SceneCanvas>
  );
}
