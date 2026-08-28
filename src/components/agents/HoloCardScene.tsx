"use client";

import { Float, Sparkles, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Color, DoubleSide, ExtrudeGeometry, Group, Mesh, MathUtils, SRGBColorSpace, Shape, ShaderMaterial, Texture, Vector2 } from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";

type Props = {
  portrait: string;
  background: string | null;
  primary: string;
  accent: string;
  glow: string;
  rightFacing: boolean;
  onReady?: () => void;
};

/** Card size in world units; camera at z=8 / fov 35 sees ~5 units of height. */
const W = 3.2;
const H = 4.4;
const CHAMFER = 0.26;

const REDUCED_MQ = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_MQ).matches, () => false);
}

/** Textures are sRGB PNGs; tag them so the shader samples linear values and the composer re-encodes once. */
function prepareTexture(tex: Texture | Texture[]) {
  for (const t of Array.isArray(tex) ? tex : [tex]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
  }
}

/** Normalised viewport pointer (-1..1), tracked on window so the card follows the mouse anywhere on the page. */
function useViewportPointer(enabled: boolean) {
  const p = useRef(new Vector2(0, 0));
  useEffect(() => {
    if (!enabled) return;
    const on = (e: PointerEvent) => {
      p.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [enabled]);
  return p;
}

/** Chamfered rectangle outline as a Shape; `inset` > 0 carves a matching hole. */
function chamferedShape(w: number, h: number, c: number): Shape {
  const s = new Shape();
  const x = w / 2;
  const y = h / 2;
  s.moveTo(-x, y);
  s.lineTo(x - c, y);
  s.lineTo(x, y - c);
  s.lineTo(x, -y);
  s.lineTo(-x + c, -y);
  s.lineTo(-x, -y + c);
  s.closePath();
  return s;
}

function frameGeometry(w: number, h: number, c: number, thickness: number, depth: number): ExtrudeGeometry {
  const outer = chamferedShape(w, h, c);
  const inner = chamferedShape(w - thickness * 2, h - thickness * 2, Math.max(0.02, c - thickness));
  outer.holes.push(inner);
  return new ExtrudeGeometry(outer, { depth, bevelEnabled: false });
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform vec2 uTilt;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFlip;
  varying vec2 vUv;

  void main() {
    vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
    float shift = 0.0025 + length(uTilt) * 0.006;
    vec4 c = texture2D(uMap, uv);
    vec4 cr = texture2D(uMap, uv + vec2(shift, 0.0));
    vec4 cb = texture2D(uMap, uv - vec2(shift, 0.0));
    float a = max(c.a, max(cr.a, cb.a) * 0.6);

    // Alpha-edge detection -> holographic rim.
    float ex = abs(texture2D(uMap, uv + vec2(uTexel.x, 0.0)).a - texture2D(uMap, uv - vec2(uTexel.x, 0.0)).a);
    float ey = abs(texture2D(uMap, uv + vec2(0.0, uTexel.y)).a - texture2D(uMap, uv - vec2(0.0, uTexel.y)).a);
    float edge = clamp((ex + ey) * 1.6, 0.0, 1.0);

    // Colour sweep in the agent palette, drifting with time and tilt.
    float sweep = sin((uv.y * 1.4 + uv.x * 0.6) * 5.0 - uTime * 0.9 + uTilt.x * 2.5) * 0.5 + 0.5;
    vec3 holo = mix(uColorA, uColorB, sweep);

    // Fine scanlines + a slow travelling band.
    float scan = 0.86 + 0.14 * sin(uv.y * 520.0 + uTime * 6.0);
    float band = 1.0 - smoothstep(0.0, 0.08, abs(fract(uv.y * 0.9 - uTime * 0.06) - 0.5));

    vec3 col = vec3(cr.r, c.g, cb.b) * scan;
    col += holo * (0.10 + band * 0.12) * c.a;
    col += holo * edge * 2.2;
    col += uColorB * band * 0.05 * c.a;

    float alpha = clamp(max(a, edge), 0.0, 1.0);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

function Portrait({ url, primary, accent, tilt, animate, flip, onReady }: { url: string; primary: string; accent: string; tilt: React.RefObject<Vector2>; animate: boolean; flip: boolean; onReady?: () => void }) {
  const map = useTexture(url, prepareTexture) as Texture;
  const mat = useRef<ShaderMaterial>(null);
  const ready = useCallback(() => onReady?.(), [onReady]);

  // Fires once the texture is in hand (this component only mounts after Suspense resolves).
  useEffect(() => {
    ready();
  }, [ready]);

  const uniforms = useMemo(() => {
    const img = map.image as { width?: number; height?: number } | undefined;
    return {
      uMap: { value: map },
      uTexel: { value: new Vector2(1 / (img?.width ?? 1024), 1 / (img?.height ?? 1024)) },
      uTime: { value: 0 },
      uTilt: { value: new Vector2() },
      uColorA: { value: new Color(primary) },
      uColorB: { value: new Color(accent) },
      uFlip: { value: flip ? 1 : 0 },
    };
  }, [map, primary, accent, flip]);

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    if (animate) m.uniforms.uTime.value += dt;
    m.uniforms.uTilt.value.lerp(tilt.current, 0.08);
  });

  // Fit the portrait inside the frame, preserving its aspect.
  const img = map.image as { width?: number; height?: number } | undefined;
  const aspect = (img?.width ?? 1) / (img?.height ?? 1);
  const ph = H * 1.08;
  const pw = ph * aspect;

  return (
    <mesh position={[0, -0.05, 0.28]} renderOrder={2}>
      <planeGeometry args={[pw, ph]} />
      <shaderMaterial ref={mat} args={[{ uniforms, vertexShader, fragmentShader }]} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Backplate({ url, primary, tilt }: { url: string; primary: string; tilt: React.RefObject<Vector2> }) {
  const map = useTexture(url, prepareTexture) as Texture;
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    // Parallax: the plate slides opposite to the tilt so the portrait appears to float above it.
    m.position.x = MathUtils.lerp(m.position.x, -tilt.current.x * 0.18, 0.08);
    m.position.y = MathUtils.lerp(m.position.y, -tilt.current.y * 0.12, 0.08);
  });
  return (
    <mesh ref={ref} position={[0, 0, -0.3]} renderOrder={0}>
      <planeGeometry args={[W * 1.25, H * 1.25]} />
      <meshBasicMaterial map={map} color={primary} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

function Frame({ glow }: { glow: string }) {
  const body = useMemo(() => frameGeometry(W + 0.22, H + 0.22, CHAMFER + 0.06, 0.11, 0.16), []);
  const rim = useMemo(() => frameGeometry(W + 0.02, H + 0.02, CHAMFER, 0.022, 0.02), []);
  const screen = useMemo(() => chamferedShape(W, H, CHAMFER), []);
  return (
    <group>
      <mesh geometry={body} position={[0, 0, -0.12]}>
        <meshStandardMaterial color="#1b2836" metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Glowing inner rim — bright enough to bloom. */}
      <mesh geometry={rim} position={[0, 0, 0.05]}>
        <meshBasicMaterial color={new Color(glow).multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      {/* Tinted "screen" that dims the backplate behind the portrait. */}
      <mesh position={[0, 0, -0.2]} renderOrder={1}>
        <shapeGeometry args={[screen]} />
        <meshBasicMaterial color="#0f1923" transparent opacity={0.45} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Card(props: Props & { reduced: boolean }) {
  const { reduced, portrait, background, primary, accent, glow, rightFacing, onReady } = props;
  const group = useRef<Group>(null);
  const pointer = useViewportPointer(!reduced);
  const size = useThree((s) => s.size);
  const isSmall = size.width < 420;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const tx = reduced ? 0 : -pointer.current.y * 0.22;
    const ty = reduced ? 0 : pointer.current.x * 0.32;
    g.rotation.x = MathUtils.lerp(g.rotation.x, tx, 0.06);
    g.rotation.y = MathUtils.lerp(g.rotation.y, ty, 0.06);
  });

  return (
    <group ref={group} scale={isSmall ? 0.92 : 1}>
      <Float speed={reduced ? 0 : 1.3} rotationIntensity={reduced ? 0 : 0.12} floatIntensity={reduced ? 0 : 0.5} floatingRange={[-0.08, 0.08]}>
        {background && <Backplate url={background} primary={primary} tilt={pointer} />}
        <Frame glow={glow} />
        <Portrait url={portrait} primary={primary} accent={accent} tilt={pointer} animate={!reduced} flip={rightFacing} onReady={onReady} />
        <Sparkles count={70} scale={[W * 1.1, H * 1.05, 1.2]} position={[0, 0, 0.2]} size={isSmall ? 2.5 : 3.5} speed={reduced ? 0 : 0.35} color={glow} opacity={0.75} noise={0.6} />
      </Float>
    </group>
  );
}

export default function HoloCardScene(props: Props) {
  const reduced = useReducedMotion();
  return (
    <SceneCanvas camera={{ position: [0, 0, 8], fov: 35 }} frameloop={reduced ? "demand" : "always"}>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 4]} intensity={30} color={props.glow} />
      <pointLight position={[-3, -2, 3]} intensity={18} color={props.accent} />
      <directionalLight position={[0, 5, 6]} intensity={1.2} color="#ece8e1" />
      <Card {...props} reduced={reduced} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.72} luminanceSmoothing={0.25} radius={0.7} />
      </EffectComposer>
    </SceneCanvas>
  );
}
