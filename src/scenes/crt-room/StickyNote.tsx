"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThemeColors } from "@/lib/theme";

/**
 * A sticky note on the bezel. CTF flag 4 of 4, base64-encoded, because
 * everyone has seen a password on a sticky note.
 */
const NOTE_LINES = ["dont forget:", "RkxBR3tuMGQz", "X2I0czM2NF9w", "NGNrM3RfMDR9"];
const SIZE = 0.3;

export function StickyNote({ theme, ...props }: { theme: ThemeColors } & React.ComponentProps<"group">) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `#${theme.text.getHexString(THREE.SRGBColorSpace)}`;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = `#${theme.void.getHexString(THREE.SRGBColorSpace)}`;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-martian-mono").trim() || "monospace";
    NOTE_LINES.forEach((line, i) => {
      ctx.font = `${i === 0 ? 400 : 600} ${i === 0 ? 38 : 50}px ${family}`;
      ctx.fillText(line, 34, 92 + i * 104);
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [theme]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}
