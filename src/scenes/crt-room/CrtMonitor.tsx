"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CrtScreen, SCREEN_H, SCREEN_W } from "./CrtScreen";
import { StickyNote } from "./StickyNote";
import { SCREEN_CENTER_Y, SCREEN_Z } from "@/lib/spline";
import { telemetry } from "@/lib/telemetry";
import { accentAt, type ThemeColors } from "@/lib/theme";

const BEZEL_W = 1.98;
const BEZEL_H = 1.6;
const BODY_DEPTH = 1.15;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/**
 * A chunky 80s terminal monitor. The bezel is a frame with a real hole and
 * the body is an open-ended tapered shell, so nothing blocks the camera once
 * the glass dissolves.
 */
export function CrtMonitor({ theme }: { theme: ThemeColors }) {
  const ledRef = useRef<THREE.MeshBasicMaterial>(null);

  const bezel = useMemo(() => {
    const shape = roundedRect(BEZEL_W, BEZEL_H, 0.1);
    shape.holes.push(roundedRect(SCREEN_W + 0.05, SCREEN_H + 0.05, 0.06));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.022,
      bevelSegments: 3,
      curveSegments: 8,
    });
    return geo;
  }, []);

  // Square frustum (4-sided open cylinder), scaled to the bezel's proportions.
  const body = useMemo(() => {
    const geo = new THREE.CylinderGeometry(Math.SQRT2, Math.SQRT2 * 0.6, BODY_DEPTH, 4, 1, true);
    geo.rotateY(Math.PI / 4);
    geo.rotateX(Math.PI / 2);
    geo.scale(BEZEL_W / 2 - 0.02, BEZEL_H / 2 - 0.02, 1);
    return geo;
  }, []);

  // Dark charcoal plastic: light enough to catch the screen spill and rim light.
  const plastic = useMemo(() => theme.text.clone().multiplyScalar(0.075), [theme]);

  useFrame(() => {
    if (ledRef.current) accentAt(theme, telemetry.modeBlend, ledRef.current.color).multiplyScalar(2.2);
  });

  const bodyZ = SCREEN_Z - 0.09 - BODY_DEPTH / 2;

  return (
    <group position={[0, SCREEN_CENTER_Y, 0]}>
      <mesh geometry={bezel} position={[0, 0, SCREEN_Z - 0.075]}>
        <meshStandardMaterial color={plastic} roughness={0.58} metalness={0.08} />
      </mesh>

      <mesh geometry={body} position={[0, 0, bodyZ]}>
        <meshStandardMaterial color={plastic} roughness={0.7} metalness={0.05} flatShading />
      </mesh>
      {/* Back plate closing the shell. */}
      <mesh position={[0, 0, bodyZ - BODY_DEPTH / 2]}>
        <boxGeometry args={[(BEZEL_W - 0.04) * 0.6, (BEZEL_H - 0.04) * 0.6, 0.04]} />
        <meshStandardMaterial color={plastic} roughness={0.75} />
      </mesh>

      <CrtScreen />

      {/* Power LED and button, bottom right of the bezel. */}
      <mesh position={[0.78, -0.715, SCREEN_Z + 0.052]}>
        <boxGeometry args={[0.04, 0.014, 0.01]} />
        <meshBasicMaterial ref={ledRef} toneMapped={false} />
      </mesh>
      <mesh position={[0.66, -0.715, SCREEN_Z + 0.05]}>
        <boxGeometry args={[0.07, 0.03, 0.02]} />
        <meshStandardMaterial color={plastic} roughness={0.4} />
      </mesh>

      {/* Neck and foot, resting on the desk (desk top is y = -0.6 in world space). */}
      <mesh position={[0, -0.735, -0.2]}>
        <boxGeometry args={[0.5, 0.17, 0.45]} />
        <meshStandardMaterial color={plastic} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.84, -0.15]}>
        <boxGeometry args={[1.0, 0.04, 0.75]} />
        <meshStandardMaterial color={plastic} roughness={0.6} />
      </mesh>

      <StickyNote position={[0.94, -0.26, SCREEN_Z + 0.078]} rotation={[0, 0, 0.07]} theme={theme} />
    </group>
  );
}
