"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { CameraRig } from "./CameraRig";
import { CrtRoom } from "./crt-room/CrtRoom";
import { CodeTunnel } from "./code-tunnel/CodeTunnel";
import { NetworkGraph } from "./network/NetworkGraph";
import { PostFX } from "@/shaders/PostFX";
import { CameraPath } from "@/lib/spline";
import { useSiteStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

/** Phones and small-core devices start on the low tier; PerformanceMonitor can still demote anyone. */
function initialLowTier() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return (coarse && window.innerWidth < 900) || (navigator.hardwareConcurrency ?? 8) <= 4;
}

/**
 * The WebGL layer: one fixed canvas behind the HTML. Loaded lazily after the
 * page's text has rendered (see StageLoader). Decorative only, so it is
 * aria-hidden; every word on the page is real HTML.
 */
export default function Stage() {
  const [lowTier, setLowTier] = useState(initialLowTier);
  const stageReady = useSiteStore((s) => s.stageReady);

  return (
    <div
      aria-hidden="true"
      className={`stage fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${stageReady ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        dpr={[1, lowTier ? 1.25 : 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false }}
        camera={{ fov: 38, near: 0.05, far: 60, position: [-0.55, 0.46, 4.9] }}
      >
        <PerformanceMonitor onDecline={() => setLowTier(true)} flipflops={2} onFallback={() => setLowTier(true)} />
        <AdaptiveDpr pixelated />
        <World lowTier={lowTier} />
      </Canvas>
    </div>
  );
}

function World({ lowTier }: { lowTier: boolean }) {
  const size = useThree((s) => s.size);
  const theme = useThemeColors();
  const reducedMotion = useSiteStore((s) => s.reducedMotion);
  const portrait = size.width / size.height < 0.9;
  const path = useMemo(() => new CameraPath(portrait), [portrait]);

  return (
    <>
      <color attach="background" args={[theme.void]} />
      <fog attach="fog" args={[theme.void, 2.5, 17]} />
      {/* A tall phone screen needs a wider lens to keep the monitor in frame. */}
      <CameraRig path={path} reducedMotion={reducedMotion} fov={portrait ? 50 : 38} />
      <CrtRoom lowTier={lowTier} />
      <CodeTunnel path={path} lowTier={lowTier} />
      <NetworkGraph path={path} lowTier={lowTier} />
      <PostFX lowTier={lowTier} />
      <ReadySignal />
    </>
  );
}

/** Flags the stage as ready after the first frames have actually rendered. */
function ReadySignal() {
  const markStageReady = useSiteStore((s) => s.markStageReady);
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) markStageReady();
  });
  return null;
}
