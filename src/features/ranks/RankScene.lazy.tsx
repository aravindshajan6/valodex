"use client";
import { lazyScene } from "@/components/three/lazyScene";
import type { RankSceneProps } from "./RankScene";
export default lazyScene<RankSceneProps>(() => import("./RankScene"));
