import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import * as THREE from "three";
import { FULL_FRAME_DITHER_FRAGMENT } from "./fullFrameDither";

/**
 * postprocessing Effect wrapper for the full-frame dither.
 * Marked CONVOLUTION because it samples the input at other UVs (cells,
 * chromatic split); it must run in its own pass after bloom.
 */
export class PixelDissolveEffect extends Effect {
  constructor() {
    super("PixelDissolveEffect", FULL_FRAME_DITHER_FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ["uProgress", new THREE.Uniform(0)],
        ["uBreak", new THREE.Uniform(0)],
        ["uFade", new THREE.Uniform(0)],
        ["uTime", new THREE.Uniform(0)],
        ["uTap", new THREE.Uniform(new THREE.Vector3(0.5, 0.5, 10))],
        ["uAccent", new THREE.Uniform(new THREE.Color())],
        ["uVoid", new THREE.Uniform(new THREE.Color())],
      ]),
    });
  }

  set(name: "uProgress" | "uBreak" | "uFade" | "uTime", value: number) {
    this.uniforms.get(name)!.value = value;
  }

  /** Where the pointer was last pressed (uv, y up) and how many seconds ago. */
  tap(x: number, y: number, age: number) {
    (this.uniforms.get("uTap")!.value as THREE.Vector3).set(x, y, age);
  }

  color(name: "uAccent" | "uVoid"): THREE.Color {
    return this.uniforms.get(name)!.value as THREE.Color;
  }
}
