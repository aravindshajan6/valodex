"use client";

import { Float, MeshDistortMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { SceneCanvas } from "@/components/three/SceneCanvas";

function Blob() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.3; });
  return (
    <Float speed={1.5} rotationIntensity={0.6} floatIntensity={1}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.4, 6]} />
        <MeshDistortMaterial color="#ff4655" distort={0.35} speed={2} roughness={0.3} metalness={0.4} />
      </mesh>
    </Float>
  );
}

export default function SmokeScene() {
  return (
    <SceneCanvas>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={2} color="#41e0c2" />
      <Blob />
    </SceneCanvas>
  );
}
