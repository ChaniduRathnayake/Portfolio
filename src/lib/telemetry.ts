/**
 * Per-frame values shared between the DOM and the WebGL scene.
 *
 * This is a plain mutable object on purpose: it changes every frame, and
 * routing it through React state would re-render the tree 60+ times a second.
 * Writers: scroll + pointer listeners and the camera rig. Readers: useFrame loops.
 */
export const telemetry = {
  /** Raw scroll position mapped onto the scene timeline (0 → SCENE_COUNT). */
  timeline: 0,
  /** Damped timeline the camera is actually at. Effects sync to this, not to raw scroll. */
  camTimeline: 0,
  /** Pointer position, -1 → 1 on both axes. */
  pointerX: 0,
  pointerY: 0,
  /** 0 = BUILD, 1 = BREAK, eased over ~0.5 s. */
  modeBlend: 0,
  /** Spikes to 1 when the mode toggles, then decays. Drives the full-frame dissolve. */
  modePulse: 0,
  /** 0 → 1 → 0 as the camera passes through the CRT glass. */
  crossingPulse: 0,
  /** Fade to background, used for reduced-motion scene cuts. */
  fade: 0,
  /** performance.now() in seconds when the CRT was switched on; -1 = still off. */
  poweredAt: -1,
  /** Where the CRT glass is on screen, as fractions of the viewport (for the HTML click target). */
  crt: { x: 0, y: 0, w: 0, h: 0, visible: false },
  /** Last pointer press: position in viewport fractions (y up) and when, in seconds. */
  tap: { x: 0.5, y: 0.5, at: -10 },
};
