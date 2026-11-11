"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraPath, STILL_SHOTS } from "@/lib/spline";
import { SCENE_COUNT } from "@/lib/scenes";
import { telemetry } from "@/lib/telemetry";

const pos = new THREE.Vector3();
const look = new THREE.Vector3();

/**
 * Moves the camera along the path. Normal mode: damped scrub of the scroll
 * timeline plus a gentle pointer sway. Reduced motion: one still shot per
 * scene, swapped behind a short fade instead of flying.
 */
export function CameraRig({ path, reducedMotion, fov }: { path: CameraPath; reducedMotion: boolean; fov: number }) {
  const shownScene = useRef(-1);
  const fadingOut = useRef(false);
  const sway = useRef(new THREE.Vector2());

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);

    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (reducedMotion) {
      const scene = Math.min(Math.floor(telemetry.timeline), SCENE_COUNT - 1);
      if (shownScene.current === -1) shownScene.current = scene;
      if (scene !== shownScene.current) fadingOut.current = true;
      telemetry.fade = THREE.MathUtils.clamp(telemetry.fade + (fadingOut.current ? dt : -dt) / 0.2, 0, 1);
      if (fadingOut.current && telemetry.fade >= 1) {
        shownScene.current = scene;
        fadingOut.current = false;
      }
      telemetry.camTimeline = shownScene.current + STILL_SHOTS[shownScene.current];
    } else {
      telemetry.fade = 0;
      telemetry.camTimeline = THREE.MathUtils.damp(telemetry.camTimeline, telemetry.timeline, 4.2, dt);
    }

    path.sample(telemetry.camTimeline, pos, look);

    // Pointer sway: strongest in the room, almost gone once we are flying.
    const strength = reducedMotion ? 0 : THREE.MathUtils.lerp(0.2, 0.05, THREE.MathUtils.smoothstep(telemetry.camTimeline, 0.2, 0.9));
    sway.current.x = THREE.MathUtils.damp(sway.current.x, telemetry.pointerX, 3, dt);
    sway.current.y = THREE.MathUtils.damp(sway.current.y, telemetry.pointerY, 3, dt);

    camera.position.set(pos.x + sway.current.x * strength, pos.y - sway.current.y * strength * 0.6, pos.z);
    camera.lookAt(look.x + sway.current.x * strength * 0.4, look.y - sway.current.y * strength * 0.3, look.z);
  });

  return null;
}
