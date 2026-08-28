"use client";
import { lazyScene } from "@/components/three/Scene3D";
import type { RankSceneProps } from "./RankScene";
export default lazyScene<RankSceneProps>(() => import("./RankScene"));
