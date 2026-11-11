"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraPath, SCREEN_Z } from "@/lib/spline";
import { seededRandom } from "@/lib/random";
import { useSiteStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

/**
 * Blocks of "code" float around the camera path, drawn like an editor minimap:
 * indented bars of different lengths, one instanced draw call for all of them.
 * Dense through scene 2, then a sparse trail along the rest of the path
 * (the network graph takes over from scene 3). Phase 3 adds real snippets.
 */

type Tone = "dim" | "text" | "hot";
interface Bar {
  matrix: THREE.Matrix4;
  tone: Tone;
}

const LINE_GAP = 0.056;
const INDENT = 0.07;

function layoutBars(path: CameraPath, blocks: number): Bar[] {
  const random = seededRandom(1337);
  const center = new THREE.Vector3();
  const look = new THREE.Vector3();
  const bars: Bar[] = [];

  for (let b = 0; b < blocks; b++) {
    // Most blocks in scene 2; a sparse trail continues past the network graph.
    const t = b % 4 !== 3 ? 1.0 + random() * 1.1 : 2.1 + random() * 3.7;
    path.sample(t, center, look);
    const angle = random() * Math.PI * 2;
    const radius = 0.55 + random() * 0.95;
    const originX = center.x + Math.cos(angle) * radius * 1.35 - 0.3;
    const originY = center.y + Math.sin(angle) * radius * 0.85;
    const z = center.z - 0.4 - random() * 0.8;

    const lines = 3 + Math.floor(random() * 7);
    let indent = 0;
    for (let l = 0; l < lines; l++) {
      if (random() < 0.3) indent = Math.max(0, Math.min(3, indent + (random() < 0.5 ? -1 : 1)));
      if (random() < 0.12) continue; // blank line
      const length = 0.08 + random() * 0.52;
      const x = originX + indent * INDENT + length / 2;
      const y = originY - l * LINE_GAP;
      const roll = random();
      const tone: Tone = roll < 0.08 ? "hot" : roll < 0.32 ? "text" : "dim";
      bars.push({
        matrix: new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z),
          new THREE.Quaternion(),
          new THREE.Vector3(length, 0.022, 0.004),
        ),
        tone,
      });
    }
  }
  return bars;
}

export function CodeTunnel({ path, lowTier }: { path: CameraPath; lowTier: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const theme = useThemeColors();
  const mode = useSiteStore((s) => s.mode);
  const bars = useMemo(() => layoutBars(path, lowTier ? 110 : 230), [path, lowTier]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    bars.forEach((bar, i) => mesh.setMatrixAt(i, bar.matrix));
    mesh.instanceMatrix.needsUpdate = true;
  }, [bars]);

  // Recolour on palette or mode change. Hot lines turn to alert in BREAK.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const tones: Record<Tone, THREE.Color> = {
      dim: theme.dim.clone().multiplyScalar(0.9),
      text: theme.text.clone().multiplyScalar(0.55),
      hot: (mode === "break" ? theme.alert : theme.primary).clone().multiplyScalar(2.2),
    };
    bars.forEach((bar, i) => mesh.setColorAt(i, tones[bar.tone]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bars, theme, mode]);

  useFrame(({ camera }) => {
    // Hidden until the screen fills the view, so it never shows around the monitor.
    if (meshRef.current) meshRef.current.visible = camera.position.z < SCREEN_Z + 1.5;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, bars.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
