"use client";
import { lazyScene } from "@/components/three/Scene3D";
export default lazyScene(() => import("./WeaponShowcaseScene"));
