"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { EffectPass } from "postprocessing";
import * as THREE from "three";
import { PixelDissolveEffect } from "./PixelDissolveEffect";
import { telemetry } from "@/lib/telemetry";
import { useSiteStore } from "@/lib/store";
import { accentAt, useThemeColors } from "@/lib/theme";

/**
 * Bloom, then the full-frame dither in a separate pass so it dissolves the
 * glow together with the picture.
 *
 * Also owns the BUILD/BREAK blend: eases telemetry.modeBlend toward the store
 * mode and turns telemetry.modePulse into a short dissolve burst.
 */
export function PostFX({ lowTier }: { lowTier: boolean }) {
  const camera = useThree((s) => s.camera);
  const theme = useThemeColors();
  const mode = useSiteStore((s) => s.mode);
  const reducedMotion = useSiteStore((s) => s.reducedMotion);

  const effect = useMemo(() => new PixelDissolveEffect(), []);
  const pass = useMemo(() => new EffectPass(camera, effect), [camera, effect]);
  useEffect(
    () => () => {
      pass.dispose();
      effect.dispose();
    },
    [pass, effect],
  );

  useFrame((state, delta) => {
    const target = mode === "break" ? 1 : 0;
    telemetry.modeBlend = THREE.MathUtils.damp(telemetry.modeBlend, target, 5, delta);
    telemetry.modePulse = Math.max(0, telemetry.modePulse - delta * 1.8);

    // Mode switch: a quick bell-shaped burst that peaks mid-way.
    const pulse = Math.sin(telemetry.modePulse * Math.PI) * 0.62;

    effect.set("uProgress", Math.max(telemetry.crossingPulse, pulse));
    effect.set("uBreak", telemetry.modeBlend);
    effect.set("uFade", telemetry.fade);
    effect.set("uTime", state.clock.elapsedTime);
    effect.tap(telemetry.tap.x, telemetry.tap.y, reducedMotion ? 10 : performance.now() / 1000 - telemetry.tap.at);
    accentAt(theme, telemetry.modeBlend, effect.color("uAccent"));
    effect.color("uVoid").copy(theme.void);
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={lowTier ? 0.75 : 1.05}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.3}
        radius={0.72}
      />
      <primitive object={pass} dispose={null} />
    </EffectComposer>
  );
}
