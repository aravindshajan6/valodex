"use client";

import { MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, useRef, type ReactNode } from "react";
import { AdditiveBlending, DoubleSide, SRGBColorSpace, TextureLoader, type Group } from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { useReducedMotion } from "@/hooks";

export type WeaponShowcaseProps = {
  /** Transparent side-view PNG of the weapon. */
  icon: string;
  /** Fires after the first frame is rendered so the host can fade its DOM fallback. */
  onReady?: () => void;
};

/** The weapon image as a textured plane, with red/holo rim ghosts behind it. */
function Weapon({ url, reduced }: { url: string; reduced: boolean }) {
  const texture = useLoader(TextureLoader, url);
  const group = useRef<Group>(null);
  const tilt = useRef({ x: 0, y: 0 });
  const pointer = useThree((s) => s.pointer);

  const img = texture.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 3;
  const w = 6.2;
  const h = w / aspect;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const sway = reduced ? 0 : 1;
    const px = reduced ? 0 : pointer.x;
    const py = reduced ? 0 : pointer.y;
    tilt.current.x += (px - tilt.current.x) * 0.06;
    tilt.current.y += (py - tilt.current.y) * 0.06;
    g.rotation.y = tilt.current.x * 0.5 + Math.sin(t * 0.5) * 0.09 * sway;
    g.rotation.x = -tilt.current.y * 0.28 + Math.sin(t * 0.7) * 0.03 * sway;
    g.rotation.z = Math.sin(t * 0.35) * 0.02 * sway;
    g.position.y = 0.55 + Math.sin(t * 0.9) * 0.08 * sway;
  });

  return (
    <group ref={group} position={[0, 0.55, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} map-colorSpace={SRGBColorSpace} transparent alphaTest={0.04} side={DoubleSide} toneMapped={false} />
      </mesh>
      {/* Rim ghosts: the same silhouette, tinted and offset, additively blended. */}
      <mesh position={[-0.035, 0.018, -0.05]} scale={1.01}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} color="#ff4655" transparent opacity={0.28} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0.04, -0.016, -0.06]} scale={1.01}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} color="#41e0c2" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <group position={[0, -1.15, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={30}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.6}
          color="#0b131b"
          metalness={0.6}
          mirror={0.45}
        />
      </mesh>
      <gridHelper args={[40, 40, "#2b3d4f", "#1b2836"]} position={[0, 0.01, 0]} />
    </group>
  );
}

function Ready({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function WeaponShowcaseScene({ icon, onReady }: WeaponShowcaseProps) {
  const reduced = useReducedMotion();
  return (
    <SceneCanvas camera={{ position: [0, 0.6, 8.5], fov: 36 }} className="absolute inset-0">
      <color attach="background" args={["#0f1923"]} />
      <fog attach="fog" args={["#0f1923", 9, 24]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-5, 3, 2]} intensity={60} color="#ff4655" distance={16} />
      <pointLight position={[5, 2.5, -1]} intensity={45} color="#41e0c2" distance={16} />
      <spotLight position={[0, 6, 4]} intensity={40} angle={0.5} penumbra={0.8} color="#ece8e1" />
      <Quiet>
        <Weapon url={icon} reduced={reduced} />
      </Quiet>
      <Floor />
      {!reduced && <Sparkles count={70} scale={[12, 5, 6]} size={2.2} speed={0.25} opacity={0.5} color="#41e0c2" />}
      <Ready onReady={onReady} />
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.6} luminanceSmoothing={0.3} />
      </EffectComposer>
    </SceneCanvas>
  );
}
