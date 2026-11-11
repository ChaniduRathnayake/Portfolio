import * as THREE from "three";
import { SCENE_COUNT } from "./scenes";

/**
 * The whole site is one camera move along a single CatmullRomCurve3.
 *
 * Keyframes are placed by hand. Each scene starts on a keyframe (SCENE_KEYS),
 * so scene boundaries land exactly where they should: the end of scene 1 is
 * the moment the camera passes through the CRT glass.
 *
 * Timeline: scene i covers timeline values [i, i + 1). Inside a scene the
 * camera moves at constant speed along the curve (arc-length), shaped by that
 * scene's easing.
 */

type V3 = readonly [number, number, number];
interface Keyframe {
  pos: V3;
  look: V3;
}

/** World z of the CRT glass. Shared with the room so the push-in and the model agree. */
export const SCREEN_Z = 0.36;
export const SCREEN_CENTER_Y = 0.26;

/** Keyframe index where each scene starts; the last entry closes scene 6. */
const SCENE_KEYS = [0, 2, 4, 7, 9, 11, 13] as const;

function keyframes(portrait: boolean): Keyframe[] {
  // On tall screens the monitor sits centred and higher, so the headline fits below it.
  const room: Keyframe[] = portrait
    ? [
        { pos: [0, 0.32, 6.9], look: [0, -0.42, 0] },
        { pos: [0, 0.29, 3.3], look: [0, 0.02, 0] },
      ]
    : [
        { pos: [-0.55, 0.46, 4.9], look: [-0.78, 0.08, 0] },
        { pos: [-0.2, 0.33, 2.5], look: [-0.16, 0.2, 0] },
      ];

  const sway = portrait ? 0.5 : 1;
  const x = (v: number) => v * sway;

  return [
    ...room,
    // Scene 2 starts in the glass.
    { pos: [0, SCREEN_CENTER_Y, SCREEN_Z - 0.06], look: [0, SCREEN_CENTER_Y, -3] },
    { pos: [x(-0.35), 0.2, -5], look: [x(0.1), 0.22, -9] },
    // Scene 3: the network.
    { pos: [x(0.3), 0.3, -11], look: [x(-0.1), 0.25, -15] },
    { pos: [x(-0.7), 0.5, -17], look: [x(0.35), 0.2, -20] },
    { pos: [x(0.6), -0.1, -23], look: [x(-0.35), 0, -26] },
    // Scene 4: the breach.
    { pos: [x(-0.3), 0.25, -29], look: [x(0.2), 0.2, -32] },
    { pos: [x(0.6), 0.6, -34.5], look: [x(-0.25), 0.15, -37] },
    // Scene 5: the log.
    { pos: [x(-0.4), -0.2, -40], look: [x(0.15), 0.05, -43] },
    { pos: [0, 0.2, -46], look: [0, 0.18, -50] },
    // Scene 6: exit.
    { pos: [0, 0.2, -52], look: [0, 0.2, -56] },
    { pos: [0, 0.24, -57], look: [0, 0.22, -62] },
    { pos: [0, 0.26, -61], look: [0, 0.22, -64] },
  ];
}

/**
 * Per-scene easing of local progress. Scene 1 holds still for the first stretch
 * so the headline can be read, then accelerates: the camera should punch
 * through the glass, not drift into it.
 */
const pushIn = (p: number) => {
  const q = THREE.MathUtils.clamp((p - 0.1) / 0.9, 0, 1);
  return q * q * (1.5 - 0.5 * q);
};

const SCENE_EASE: ((p: number) => number)[] = [
  pushIn,
  (p) => p,
  (p) => p,
  (p) => p,
  (p) => p,
  (p) => p,
];

/** Where the camera rests in each scene when motion is reduced (local progress). */
export const STILL_SHOTS = [0, 0.45, 0.4, 0.5, 0.5, 0.6];

const DIVISIONS_PER_KEY = 48;

export class CameraPath {
  private readonly pos: THREE.CatmullRomCurve3;
  private readonly look: THREE.CatmullRomCurve3;
  /** Arc-length fraction (0–1) of the position curve at each keyframe. */
  private readonly keyU: number[];

  constructor(portrait: boolean) {
    const keys = keyframes(portrait);
    // Centripetal parameterisation avoids overshoot where keyframe spacing changes sharply.
    this.pos = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
    this.look = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");

    const segments = keys.length - 1;
    this.pos.arcLengthDivisions = segments * DIVISIONS_PER_KEY;
    const lengths = this.pos.getLengths();
    const total = lengths[lengths.length - 1];
    this.keyU = keys.map((_, i) => lengths[i * DIVISIONS_PER_KEY] / total);
  }

  /** Camera position and look-at target for a timeline value (0 → SCENE_COUNT). */
  sample(timeline: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const t = THREE.MathUtils.clamp(timeline, 0, SCENE_COUNT);
    const scene = Math.min(Math.floor(t), SCENE_COUNT - 1);
    const local = SCENE_EASE[scene](t - scene);
    const u = THREE.MathUtils.lerp(this.keyU[SCENE_KEYS[scene]], this.keyU[SCENE_KEYS[scene + 1]], local);
    // Both curves share the same parameter so position and target stay paired at keyframes.
    const curveT = this.pos.getUtoTmapping(u, 0);
    this.pos.getPoint(curveT, outPos);
    this.look.getPoint(curveT, outLook);
  }
}
