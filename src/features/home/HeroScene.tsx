"use client";

import { Edges, Environment, Float, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Scanline, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";

/**
 * Landing hero: a stylised Valorant Spike built from primitives — chamfered
 * armour plates around a pulsing red core, holographic cyan rings, a drifting
 * particle field, mouse parallax and a bloom + scanline post stack.
 * Everything is procedural; nothing is fetched.
 */

const INK = "#0f1923";
const RED = "#ff4655";
const HOLO = "#41e0c2";
const CHASSIS = "#141d27";
const STEEL = "#26313d";

/* ---------- hooks ---------- */

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

/** Normalised pointer (-1..1) tracked on the window so content layered over the canvas still drives parallax. */
function usePointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

/* ---------- helpers ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- geometry ---------- */

function chamferedShape(w: number, h: number, c: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + c, -h / 2);
  s.lineTo(w / 2 - c, -h / 2);
  s.lineTo(w / 2, -h / 2 + c);
  s.lineTo(w / 2, h / 2 - c);
  s.lineTo(w / 2 - c, h / 2);
  s.lineTo(-w / 2 + c, h / 2);
  s.lineTo(-w / 2, h / 2 - c);
  s.lineTo(-w / 2, -h / 2 + c);
  s.closePath();
  return s;
}

function useChamferedPlate(w: number, h: number, depth: number, c = 0.08) {
  return useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(chamferedShape(w, h, c), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    geo.center();
    return geo;
  }, [w, h, depth, c]);
}

/* ---------- parts ---------- */

function ArmourPlates({ reduced }: { reduced: boolean }) {
  const plate = useChamferedPlate(0.46, 1.25, 0.1);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reduced) return;
    // plates breathe outward slightly on the core's heartbeat
    const t = clock.elapsedTime;
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 6);
    group.current.children.forEach((child, i) => {
      const a = (i / 4) * Math.PI * 2;
      const r = 0.6 + beat * 0.035;
      child.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    });
  });
  return (
    <group ref={group}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} geometry={plate} position={[Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6]} rotation={[0, a, 0]}>
            <meshStandardMaterial color={CHASSIS} metalness={0.85} roughness={0.32} />
            <Edges color="#2c6f66" threshold={25} />
          </mesh>
        );
      })}
    </group>
  );
}

function Core({ reduced }: { reduced: boolean }) {
  const sphere = useRef<THREE.Mesh>(null);
  const band = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 6);
    const base = reduced ? 0.55 : 0.35;
    if (sphere.current) {
      const m = sphere.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.6 + beat * 3.4;
      const s = 1 + beat * 0.08;
      sphere.current.scale.setScalar(s);
      if (!reduced) sphere.current.rotation.y = t * 0.8;
    }
    if (band.current) {
      const m = band.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.9 + beat * 1.8;
    }
    if (light.current) light.current.intensity = 6 + beat * 14 + base;
  });
  return (
    <group>
      {/* inner glowing band bridging the two hull halves */}
      <mesh ref={band}>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 8, 1, true]} />
        <meshStandardMaterial color="#5a0f18" emissive={RED} emissiveIntensity={1} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* the core itself — a faceted sphere */}
      <mesh ref={sphere}>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={2} roughness={0.25} metalness={0.1} flatShading />
      </mesh>
      <pointLight ref={light} color={RED} intensity={8} distance={5} decay={2} />
    </group>
  );
}

function Hull() {
  return (
    <group>
      {/* upper hull */}
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.42, 0.54, 0.82, 8]} />
        <meshStandardMaterial color={CHASSIS} metalness={0.9} roughness={0.3} />
        <Edges color="#2c6f66" threshold={20} />
      </mesh>
      {/* cap + antenna */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.16, 0.42, 0.26, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.6, 6]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
      </mesh>
      <AntennaTip />
      {/* lower hull */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.54, 0.64, 0.9, 8]} />
        <meshStandardMaterial color={CHASSIS} metalness={0.9} roughness={0.3} />
        <Edges color="#2c6f66" threshold={20} />
      </mesh>
      {/* holo trim strip on the lower hull */}
      <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.012, 6, 8]} />
        <meshStandardMaterial color={HOLO} emissive={HOLO} emissiveIntensity={1.6} roughness={0.4} />
      </mesh>
      {/* vents */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.6, -0.92, Math.cos(a) * 0.6]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.16, 0.05, 0.06]} />
            <meshStandardMaterial color="#0a1016" metalness={0.6} roughness={0.7} />
          </mesh>
        );
      })}
      {/* tripod legs */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.62, -1.42, 0]} rotation={[0, 0, 0.55]}>
              <boxGeometry args={[0.09, 0.78, 0.13]} />
              <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.35} />
            </mesh>
            <mesh position={[0.86, -1.76, 0]}>
              <boxGeometry args={[0.22, 0.06, 0.16]} />
              <meshStandardMaterial color={CHASSIS} metalness={0.85} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function AntennaTip() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = Math.sin(clock.elapsedTime * 5) > 0.86 ? 7 : 0.5;
  });
  return (
    <mesh ref={ref} position={[0, 1.95, 0]}>
      <sphereGeometry args={[0.05, 12, 12]} />
      <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.5} />
    </mesh>
  );
}

function HoloRings({ reduced }: { reduced: boolean }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const c = useRef<THREE.Group>(null);
  const ticks = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (reduced) return;
    if (a.current) a.current.rotation.y += dt * 0.35;
    if (b.current) {
      b.current.rotation.y -= dt * 0.22;
      b.current.rotation.x = Math.PI / 2 + Math.sin(performance.now() * 0.0004) * 0.25;
    }
    if (c.current) c.current.rotation.z += dt * 0.5;
    if (ticks.current) ticks.current.rotation.y -= dt * 0.12;
  });
  const holo = <meshBasicMaterial color={HOLO} transparent opacity={0.85} toneMapped={false} />;
  return (
    <group>
      {/* flat orbit ring with ticks */}
      <group ref={a} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.35, 0.008, 6, 128]} />
          {holo}
        </mesh>
        <mesh>
          <ringGeometry args={[1.42, 1.5, 128, 1, 0, Math.PI * 0.6]} />
          <meshBasicMaterial color={HOLO} transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      {/* tilted wobbling ring */}
      <group ref={b} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.75, 0.006, 6, 160]} />
          <meshBasicMaterial color={HOLO} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
      {/* vertical ring */}
      <group ref={c} rotation={[0, Math.PI / 4, 0]}>
        <mesh>
          <torusGeometry args={[2.05, 0.005, 6, 160, Math.PI * 1.4]} />
          <meshBasicMaterial color={HOLO} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      </group>
      {/* dashed tick ring */}
      <group ref={ticks}>
        {Array.from({ length: 36 }).map((_, i) => {
          const ang = (i / 36) * Math.PI * 2;
          const long = i % 6 === 0;
          return (
            <mesh key={i} position={[Math.sin(ang) * 1.6, 0, Math.cos(ang) * 1.6]} rotation={[0, ang, 0]}>
              <boxGeometry args={[0.01, long ? 0.12 : 0.05, 0.01]} />
              <meshBasicMaterial color={HOLO} transparent opacity={long ? 0.9 : 0.5} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Particles({ reduced }: { reduced: boolean }) {
  const holoRef = useRef<THREE.Points>(null);
  const redRef = useRef<THREE.Points>(null);
  const { holo, red } = useMemo(() => {
    // Seeded PRNG keeps the field deterministic across renders (pure), unlike Math.random.
    const make = (n: number, spread: [number, number, number], seed: number) => {
      const rand = mulberry32(seed);
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (rand() - 0.5) * spread[0];
        arr[i * 3 + 1] = (rand() - 0.5) * spread[1];
        arr[i * 3 + 2] = (rand() - 0.5) * spread[2];
      }
      return arr;
    };
    return { holo: make(520, [16, 10, 8], 1337), red: make(90, [10, 7, 5], 4242) };
  }, []);
  useFrame((_, dt) => {
    if (reduced) return;
    for (const ref of [holoRef, redRef]) {
      const pts = ref.current;
      if (!pts) continue;
      pts.rotation.y += dt * 0.02;
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += dt * 0.08;
        if (arr[i] > 5) arr[i] = -5;
      }
      pos.needsUpdate = true;
    }
  });
  return (
    <group>
      <points ref={holoRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[holo, 3]} />
        </bufferGeometry>
        <pointsMaterial color={HOLO} size={0.03} sizeAttenuation transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={redRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[red, 3]} />
        </bufferGeometry>
        <pointsMaterial color={RED} size={0.05} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function Spike({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  // Narrow viewports: shrink and centre so the headline can sit above; wide: push right of the copy.
  const narrow = viewport.width < 6.2;
  const scale = narrow ? Math.min(0.72, Math.max(0.55, viewport.width / 5)) : 1;
  const x = narrow ? 0 : Math.min(viewport.width * 0.2, 2.4);
  // Narrow: the copy is bottom-anchored, so lift the spike into the upper half.
  const y = narrow ? 0.75 : -0.05;

  useFrame((_, dt) => {
    if (!group.current || reduced) return;
    group.current.rotation.y += dt * 0.18;
  });

  return (
    <group position={[x, y, 0]} scale={scale}>
      <Float speed={reduced ? 0 : 1.2} rotationIntensity={reduced ? 0 : 0.12} floatIntensity={reduced ? 0 : 0.5}>
        <group ref={group} rotation={[0.08, 0.6, 0]}>
          <Hull />
          <ArmourPlates reduced={reduced} />
          <Core reduced={reduced} />
        </group>
        <HoloRings reduced={reduced} />
      </Float>
      {/* holographic ground */}
      <group position={[0, -1.85, 0]}>
        <gridHelper args={[9, 30, HOLO, "#1a2b38"]} material-transparent material-opacity={0.22} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 0.97, 96]} />
          <meshBasicMaterial color={HOLO} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 64]} />
          <meshBasicMaterial color={RED} transparent opacity={0.08} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function CameraRig({ reduced }: { reduced: boolean }) {
  const pointer = usePointer();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    if (reduced) return;
    target.set(pointer.current.x * 0.55, 0.15 + pointer.current.y * 0.35, 6.4);
    camera.position.lerp(target, 0.035);
    camera.lookAt(0, -0.1, 0);
  });
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#2b3d4d", "#05090d", 0.6]} />
      <directionalLight position={[-4, 5, 3]} intensity={2.2} color={HOLO} />
      <directionalLight position={[5, 2, -3]} intensity={1.2} color="#ffffff" />
      <spotLight position={[0, 6, 2]} intensity={6} angle={0.5} penumbra={1} color="#dfe8ff" />
      <Environment resolution={64}>
        <Lightformer form="ring" intensity={3} position={[0, 5, -6]} scale={5} color={HOLO} />
        <Lightformer form="rect" intensity={1.5} position={[-6, 1, 3]} scale={[3, 7, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={4} position={[6, -1, 3]} scale={[2, 5, 1]} color={RED} />
      </Environment>
    </>
  );
}

/* ---------- scene ---------- */

export default function HeroScene() {
  const reduced = useReducedMotion();
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pause the render loop once the hero has scrolled off-screen.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="absolute inset-0" aria-hidden>
      <SceneCanvas camera={{ position: [0, 0.15, 6.4], fov: 40 }} frameloop={visible ? "always" : "never"}>
        <color attach="background" args={[INK]} />
        <fog attach="fog" args={[INK, 7, 14]} />
        <Lights />
        <CameraRig reduced={reduced} />
        <Spike reduced={reduced} />
        <Particles reduced={reduced} />
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.25} mipmapBlur intensity={1.15} radius={0.65} />
          <Scanline density={1.3} opacity={0.07} />
          <Vignette offset={0.22} darkness={0.75} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  );
}
