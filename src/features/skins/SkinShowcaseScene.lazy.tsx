"use client";
import { lazyScene } from "@/components/three/lazyScene";
export default lazyScene(() => import("./SkinShowcaseScene"));
