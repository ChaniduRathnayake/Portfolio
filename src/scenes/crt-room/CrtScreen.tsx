"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CRT_FRAGMENT, CRT_VERTEX } from "@/shaders/crtScreen";
import { TerminalCanvas } from "./terminalCanvas";
import { SCREEN_Z } from "@/lib/spline";
import { telemetry } from "@/lib/telemetry";
import { useSiteStore } from "@/lib/store";
import { accentAt, useThemeColors } from "@/lib/theme";

export const SCREEN_W = 1.5;
export const SCREEN_H = 1.125;
const BULGE = 0.05;

/** Optional photo, shown dithered on the screen. Missing file = no portrait. */
const PORTRAIT_SRC = "/images/portrait.jpg";

/** Tube glass bulged toward the viewer: centre at SCREEN_Z, corners BULGE behind it. */
function useCurvedGlass() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 40, 30);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (SCREEN_W / 2);
      const ny = pos.getY(i) / (SCREEN_H / 2);
      pos.setZ(i, BULGE * (1 - 0.5 * nx * nx - 0.5 * ny * ny));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const CORNERS = [
  [-SCREEN_W / 2, -SCREEN_H / 2],
  [SCREEN_W / 2, -SCREEN_H / 2],
  [-SCREEN_W / 2, SCREEN_H / 2],
  [SCREEN_W / 2, SCREEN_H / 2],
] as const;
const corner = new THREE.Vector3();

export function CrtScreen() {
  const theme = useThemeColors();
  const mode = useSiteStore((s) => s.mode);
  const geometry = useCurvedGlass();
  const terminal = useMemo(() => new TerminalCanvas(), []);
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uContent: { value: terminal.texture },
      uTime: { value: 0 },
      uPower: { value: 0 },
      uDissolve: { value: 0 },
      uBreak: { value: 0 },
      uAspect: { value: SCREEN_W / SCREEN_H },
      uPhosphor: { value: new THREE.Color() },
      uGlass: { value: new THREE.Color() },
    }),
    [terminal],
  );

  useEffect(() => () => terminal.dispose(), [terminal]);

  // Draw with the same mono font as the HTML once it has loaded.
  useEffect(() => {
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-martian-mono").trim();
    if (!family) return;
    document.fonts
      .load(`22px ${family}`)
      .then(() => terminal.setFont(family))
      .catch(() => undefined);
  }, [terminal]);

  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => terminal.setPortrait(image);
    image.src = PORTRAIT_SRC;
    return () => {
      image.onload = null;
    };
  }, [terminal]);

  // Retype the session when the mode flips.
  useEffect(() => {
    terminal.setMode(mode, performance.now() / 1000);
  }, [mode, terminal]);

  useFrame((state) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const now = performance.now() / 1000;
    terminal.update(now, telemetry.poweredAt);

    u.uTime.value = state.clock.elapsedTime;
    u.uPower.value = telemetry.poweredAt < 0 ? 0 : THREE.MathUtils.clamp((now - telemetry.poweredAt) / 0.9, 0, 1);

    // The glass opens as the camera closes in: nothing until 1.25 units out, gone at 0.1.
    const distance = state.camera.position.z - SCREEN_Z;
    u.uDissolve.value = 1 - THREE.MathUtils.smoothstep(distance, 0.1, 1.25);
    // A short full-frame dither burst right as we pass through.
    telemetry.crossingPulse = (1 - THREE.MathUtils.smoothstep(Math.abs(distance), 0, 0.3)) * 0.45;

    // Tell the HTML layer where the glass is, so it can be clicked (see CrtHotspot).
    const glass = telemetry.crt;
    glass.visible = telemetry.camTimeline < 0.3 && telemetry.poweredAt >= 0 && mesh.current !== null;
    if (glass.visible && mesh.current) {
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (const [x, y] of CORNERS) {
        corner.set(x, y, 0);
        mesh.current.localToWorld(corner).project(state.camera);
        minX = Math.min(minX, corner.x * 0.5 + 0.5);
        maxX = Math.max(maxX, corner.x * 0.5 + 0.5);
        minY = Math.min(minY, 0.5 - corner.y * 0.5);
        maxY = Math.max(maxY, 0.5 - corner.y * 0.5);
      }
      glass.x = minX;
      glass.y = minY;
      glass.w = maxX - minX;
      glass.h = maxY - minY;
    }

    u.uBreak.value = telemetry.modeBlend;
    accentAt(theme, telemetry.modeBlend, u.uPhosphor.value);
    u.uGlass.value.copy(theme.void);
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[0, 0, SCREEN_Z - BULGE]}>
      <shaderMaterial
        ref={material}
        vertexShader={CRT_VERTEX}
        fragmentShader={CRT_FRAGMENT}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}
