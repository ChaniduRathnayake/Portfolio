"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { CrtMonitor } from "./CrtMonitor";
import { SCREEN_H, SCREEN_W } from "./CrtScreen";
import { Cable, Desk, Keyboard, Mug } from "./DeskProps";
import { DustMotes } from "./DustMotes";
import { SCREEN_CENTER_Y, SCREEN_Z } from "@/lib/spline";
import { telemetry } from "@/lib/telemetry";
import { accentAt, useThemeColors } from "@/lib/theme";

// RectAreaLight needs its lookup tables registered once.
RectAreaLightUniformsLib.init();

/**
 * Scene 1. A dark room lit only by the monitor: the screen is a rectangular
 * area light that spills onto the desk, plus a faint cold rim from behind so
 * the silhouette separates from the dark.
 */
export function CrtRoom({ lowTier }: { lowTier: boolean }) {
  const theme = useThemeColors();
  const groupRef = useRef<THREE.Group>(null);
  const screenLight = useRef<THREE.RectAreaLight>(null);
  const fillLight = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    // Once we are through the glass the room is behind us: skip drawing it.
    if (groupRef.current) groupRef.current.visible = telemetry.camTimeline < 1.15;

    const powered = telemetry.poweredAt < 0 ? 0 : Math.min(1, (performance.now() / 1000 - telemetry.poweredAt) / 0.9);
    const flicker = 0.97 + 0.03 * Math.sin(state.clock.elapsedTime * 47.0);
    for (const light of [screenLight.current, fillLight.current]) {
      if (light) accentAt(theme, telemetry.modeBlend, light.color);
    }
    if (screenLight.current) screenLight.current.intensity = 5.5 * powered * flicker;
    if (fillLight.current) fillLight.current.intensity = 1.6 * powered * flicker;
  });

  return (
    <group ref={groupRef}>
      <rectAreaLight
        ref={screenLight}
        position={[0, SCREEN_CENTER_Y, SCREEN_Z + 0.02]}
        rotation={[0, Math.PI, 0]}
        width={SCREEN_W}
        height={SCREEN_H}
        intensity={0}
      />
      <pointLight ref={fillLight} position={[0, SCREEN_CENTER_Y - 0.2, SCREEN_Z + 0.7]} distance={3.5} decay={2} intensity={0} />
      <spotLight
        position={[0.8, 2.8, -2.6]}
        angle={0.5}
        penumbra={0.9}
        intensity={7}
        distance={7}
        decay={1.5}
        color={theme.dim}
      />
      <ambientLight intensity={0.05} color={theme.dim} />

      <CrtMonitor theme={theme} />
      <Desk theme={theme} lowTier={lowTier} />
      <Keyboard theme={theme} />
      <Mug theme={theme} />
      <Cable theme={theme} />
      <DustMotes theme={theme} count={lowTier ? 110 : 320} />
    </group>
  );
}
