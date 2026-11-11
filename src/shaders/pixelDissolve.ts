/**
 * Pixel dissolve: the core transition of the site.
 *
 * Shared GLSL, included by:
 *   - the CRT screen material  (the glass breaks apart as the camera pushes through)
 *   - the full-frame post pass (the glass crossing, the BUILD/BREAK switch, later the breach)
 *
 * How it works
 *   1. The image is cut into square cells. Cell size doubles in steps as
 *      progress rises (1 → 2 → 4 → 8 → 16 → 32 px on the post pass), so the
 *      picture gets chunkier while it falls apart. Steps instead of a smooth
 *      size keep the pattern stable: a continuous size would reshuffle every
 *      cell on every frame and read as noise, not as pixels.
 *   2. Each cell gets a threshold: an 8×8 Bayer value (ordered and structured)
 *      mixed with white noise (hides the Bayer cross-hatch).
 *   3. A cell drops out once progress passes its threshold. Cells just above
 *      the cut "ignite" so the edge of the dissolve glows in the accent colour.
 */
export const PIXEL_DISSOLVE_GLSL = /* glsl */ `
// Ordered dither, built recursively: bayer2 is the 2×2 matrix [0 2; 3 1] / 4,
// each level nests the previous one at half resolution. Output in [0, 1).
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

// Cheap, stable 2D → 1D hash (Dave Hoskins). Same cell in, same value out.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Number of cell-size doublings reached at this progress (0 … steps).
float dissolveLevel(float progress, float steps) {
  return floor(clamp(progress, 0.0, 1.0) * steps + 1e-4);
}

// Per-cell threshold in [0, 1): mostly Bayer, some noise.
float dissolveThreshold(vec2 cell, float noiseMix) {
  return mix(bayer8(cell), hash12(cell), noiseMix);
}

// x = keep (1 = cell still visible, 0 = dropped)
// y = ignite (0–1 glow for cells about to drop)
vec2 dissolveMask(float threshold, float progress, float edgeWidth) {
  float keep = step(progress, threshold);
  float ignite = keep * (1.0 - smoothstep(0.0, edgeWidth, threshold - progress));
  // No glow at rest, or every low-threshold cell would shimmer.
  ignite *= smoothstep(0.0, 0.04, progress);
  return vec2(keep, ignite);
}
`;
