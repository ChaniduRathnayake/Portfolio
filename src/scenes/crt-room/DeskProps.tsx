"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeColors } from "@/lib/theme";

const DESK_Y = -0.6;

/** The desk surface. Glossy reflection of the screen on capable GPUs, plain otherwise. */
export function Desk({ theme, lowTier }: { theme: ThemeColors; lowTier: boolean }) {
  const color = useMemo(() => theme.void.clone().multiplyScalar(0.8), [theme]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y, 0.6]}>
      <planeGeometry args={[10, 7]} />
      {lowTier ? (
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.2} />
      ) : (
        <MeshReflectorMaterial
          color={color}
          resolution={512}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={2.2}
          mixContrast={1.1}
          depthScale={0.6}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          roughness={0.85}
          metalness={0.35}
          mirror={0}
        />
      )}
    </mesh>
  );
}

const KEY = 0.074;
const ROWS = 4;
const COLS = 13;

/** Keyboard: a rounded case plus one instanced draw for every keycap. */
export function Keyboard({ theme }: { theme: ThemeColors }) {
  const capsRef = useRef<THREE.InstancedMesh>(null);
  const caseColor = useMemo(() => theme.surface.clone().lerp(theme.void, 0.3), [theme]);
  const capColor = useMemo(() => theme.surface.clone().multiplyScalar(1.35), [theme]);

  useLayoutEffect(() => {
    const caps = capsRef.current;
    if (!caps) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c - (COLS - 1) / 2) * (KEY + 0.012) + (r % 2) * 0.02;
        const z = (r - (ROWS - 1) / 2) * (KEY + 0.012) - 0.03;
        m.makeTranslation(x, 0.04, z);
        caps.setMatrixAt(i++, m);
      }
    }
    // Space bar.
    m.compose(new THREE.Vector3(0, 0.04, 0.19), new THREE.Quaternion(), new THREE.Vector3(6, 1, 1));
    caps.setMatrixAt(i, m);
    caps.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group position={[-0.05, DESK_Y, 1.15]} rotation={[0.04, 0.03, 0]}>
      <RoundedBox args={[1.26, 0.05, 0.5]} radius={0.016} smoothness={3} position={[0, 0.025, 0]}>
        <meshStandardMaterial color={caseColor} roughness={0.6} />
      </RoundedBox>
      <instancedMesh ref={capsRef} args={[undefined, undefined, ROWS * COLS + 1]}>
        <boxGeometry args={[KEY, 0.032, KEY]} />
        <meshStandardMaterial color={capColor} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

/** A mug, turned on a lathe. */
export function Mug({ theme }: { theme: ThemeColors }) {
  const geometry = useMemo(() => {
    const profile = [
      [0, 0],
      [0.062, 0],
      [0.066, 0.004],
      [0.066, 0.14],
      [0.06, 0.14],
      [0.058, 0.012],
      [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 32);
  }, []);
  const color = useMemo(() => theme.text.clone().multiplyScalar(0.18), [theme]);

  return (
    <group position={[1.02, DESK_Y, 0.95]} rotation={[0, -0.6, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.068, 0.072, 0]}>
        <torusGeometry args={[0.035, 0.008, 8, 20, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Power cable from the back of the monitor, off the edge of the desk. */
export function Cable({ theme }: { theme: ThemeColors }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        [-0.25, -0.25, -0.75],
        [-0.45, -0.55, -0.55],
        [-0.9, -0.59, 0.05],
        [-1.6, -0.59, 0.35],
        [-2.6, -0.6, 0.1],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    return new THREE.TubeGeometry(curve, 64, 0.011, 6, false);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={theme.void} roughness={0.5} />
    </mesh>
  );
}
