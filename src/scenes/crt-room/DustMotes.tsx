"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "@/lib/random";
import { SCREEN_CENTER_Y, SCREEN_Z } from "@/lib/spline";
import { telemetry } from "@/lib/telemetry";
import { accentAt, type ThemeColors } from "@/lib/theme";

/**
 * Dust drifting through the light of the screen. All motion happens in the
 * vertex shader, so the CPU never touches the buffer after creation.
 */
const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vLight;

void main() {
  vec3 p = position;
  // Slow fall with a lazy sideways sway; wraps vertically.
  p.y = mod(p.y - uTime * (0.015 + aSeed * 0.02) + 1.0, 2.2) - 0.75;
  p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.06;
  p.z += cos(uTime * 0.23 + aSeed * 23.0) * 0.05;

  // Brightest inside the beam in front of the screen.
  float beam = 1.0 - smoothstep(0.4, 1.4, length(p.xy - vec2(0.0, ${SCREEN_CENTER_Y.toFixed(2)})));
  float depth = 1.0 - smoothstep(0.0, 3.2, p.z - ${SCREEN_Z.toFixed(2)});
  vLight = beam * depth;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (1.4 + aSeed * 2.4) * uPixelRatio * (3.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vLight;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.0, d) * (0.08 + vLight * 0.75);
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`;

export function DustMotes({ theme, count }: { theme: ThemeColors; count: number }) {
  const geometry = useMemo(() => {
    const random = seededRandom(7);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 3.2;
      positions[i * 3 + 1] = random() * 2.2 - 0.75;
      positions[i * 3 + 2] = SCREEN_Z + 0.15 + random() * 3.6;
      seeds[i] = random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } }),
    [],
  );

  useFrame((state) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    accentAt(theme, telemetry.modeBlend, u.uColor.value).multiplyScalar(1.4);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
