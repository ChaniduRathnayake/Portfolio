"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraPath } from "@/lib/spline";
import { seededRandom } from "@/lib/random";
import { telemetry } from "@/lib/telemetry";
import { accentAt, useThemeColors } from "@/lib/theme";

/**
 * Scenes 3–5 (first pass): a network the camera flies through. Server nodes
 * sit around the path, each linked to its nearest neighbours, with packets
 * travelling along the links. Nodes around the breach (timeline 3–4) run hot
 * in the alert colour. Three draw calls: nodes, links, packets.
 */

interface Graph {
  nodes: { pos: THREE.Vector3; size: number; breached: boolean }[];
  /** Pairs of node indices. */
  edges: [number, number][];
}

const NEIGHBOURS = 2;

function buildGraph(path: CameraPath, count: number): Graph {
  const random = seededRandom(4242);
  const center = new THREE.Vector3();
  const look = new THREE.Vector3();
  const nodes: Graph["nodes"] = [];

  for (let i = 0; i < count; i++) {
    const t = 1.85 + (i / count) * 3.2 + random() * 0.08;
    path.sample(t, center, look);
    const angle = random() * Math.PI * 2;
    const radius = 0.55 + random() * 1.25;
    nodes.push({
      pos: new THREE.Vector3(
        center.x + Math.cos(angle) * radius * 1.4,
        center.y + Math.sin(angle) * radius * 0.85,
        center.z - random() * 1.5,
      ),
      size: 0.05 + random() * 0.07,
      breached: t > 2.95 && t < 4.0 && random() < 0.55,
    });
  }

  // Link each node to its nearest neighbours (deduplicated).
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  nodes.forEach((node, i) => {
    nodes
      .map((other, j) => ({ j, d: i === j ? Infinity : node.pos.distanceToSquared(other.pos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, NEIGHBOURS)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  return { nodes, edges };
}

// Packets: each one rides one edge; position is computed on the GPU.
const PACKET_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aSpeed;
attribute float aOffset;
attribute float aHot;
varying float vHot;

void main() {
  float t = fract(uTime * aSpeed + aOffset);
  vec4 mv = modelViewMatrix * vec4(mix(aFrom, aTo, t), 1.0);
  vHot = aHot;
  gl_PointSize = (4.0 + aHot * 2.5) * uPixelRatio * (3.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const PACKET_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAlert;
varying float vHot;

void main() {
  // Square packets: this is a pixel world.
  vec2 d = abs(gl_PointCoord - 0.5);
  if (max(d.x, d.y) > 0.5) discard;
  gl_FragColor = vec4(mix(uColor, uAlert, vHot) * 2.2, 1.0);
}
`;

export function NetworkGraph({ path, lowTier }: { path: CameraPath; lowTier: boolean }) {
  const theme = useThemeColors();
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const linksRef = useRef<THREE.LineBasicMaterial>(null);
  const packetsRef = useRef<THREE.ShaderMaterial>(null);

  const graph = useMemo(() => buildGraph(path, lowTier ? 70 : 140), [path, lowTier]);

  const linkGeometry = useMemo(() => {
    const positions = new Float32Array(graph.edges.length * 6);
    graph.edges.forEach(([a, b], i) => {
      graph.nodes[a].pos.toArray(positions, i * 6);
      graph.nodes[b].pos.toArray(positions, i * 6 + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [graph]);

  const packetGeometry = useMemo(() => {
    const random = seededRandom(99);
    const perEdge = 3;
    const n = graph.edges.length * perEdge;
    const from = new Float32Array(n * 3);
    const to = new Float32Array(n * 3);
    const speed = new Float32Array(n);
    const offset = new Float32Array(n);
    const hot = new Float32Array(n);
    graph.edges.forEach(([a, b], e) => {
      for (let k = 0; k < perEdge; k++) {
        const i = e * perEdge + k;
        // Alternate direction so traffic flows both ways.
        const [s, d] = k % 2 ? [b, a] : [a, b];
        graph.nodes[s].pos.toArray(from, i * 3);
        graph.nodes[d].pos.toArray(to, i * 3);
        speed[i] = 0.15 + random() * 0.35;
        offset[i] = random();
        hot[i] = graph.nodes[a].breached || graph.nodes[b].breached ? 1 : 0;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    geo.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    geo.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
    geo.setAttribute("aHot", new THREE.BufferAttribute(hot, 1));
    return geo;
  }, [graph]);

  useEffect(
    () => () => {
      linkGeometry.dispose();
      packetGeometry.dispose();
    },
    [linkGeometry, packetGeometry],
  );

  const packetUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color() },
      uAlert: { value: new THREE.Color() },
    }),
    [],
  );

  // Node transforms and colours: breached nodes in alert, the rest in the accent.
  useLayoutEffect(() => {
    const mesh = nodesRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const hot = theme.alert.clone().multiplyScalar(2.4);
    const calm = theme.primary.clone().multiplyScalar(1.6);
    const quiet = theme.dim.clone().multiplyScalar(1.4);
    graph.nodes.forEach((node, i) => {
      q.setFromEuler(new THREE.Euler(i * 0.7, i * 1.3, 0));
      m.compose(node.pos, q, new THREE.Vector3().setScalar(node.size));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, node.breached ? hot : i % 3 === 0 ? calm : quiet);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [graph, theme]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.visible = telemetry.camTimeline > 1.4;
    if (linksRef.current) accentAt(theme, telemetry.modeBlend, linksRef.current.color).multiplyScalar(0.8);
    const u = packetsRef.current?.uniforms;
    if (u) {
      u.uTime.value = state.clock.elapsedTime;
      u.uPixelRatio.value = state.gl.getPixelRatio();
      accentAt(theme, telemetry.modeBlend, u.uColor.value);
      u.uAlert.value.copy(theme.alert);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, graph.nodes.length]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} wireframe />
      </instancedMesh>
      <lineSegments geometry={linkGeometry} frustumCulled={false}>
        <lineBasicMaterial ref={linksRef} transparent opacity={0.75} toneMapped={false} />
      </lineSegments>
      <points geometry={packetGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={packetsRef}
          vertexShader={PACKET_VERTEX}
          fragmentShader={PACKET_FRAGMENT}
          uniforms={packetUniforms}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
