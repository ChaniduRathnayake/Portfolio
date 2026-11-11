import { PIXEL_DISSOLVE_GLSL } from "./pixelDissolve";

/**
 * Full-frame post pass (runs after bloom, so the glow dissolves with the image).
 *
 *   uProgress  0 → 1  pixel dissolve of the whole frame (glass crossing, mode switch)
 *   uBreak     0 → 1  BREAK look: chromatic split, tearing, red halftone in shadows
 *   uFade      0 → 1  fade to background (reduced-motion scene cuts)
 *   uTap       xy = where the pointer was pressed (uv), z = seconds since
 *
 * Written for postprocessing's Effect API: mainImage() receives the incoming
 * colour; `inputBuffer`, `resolution` and `texelSize` are provided.
 */
export const FULL_FRAME_DITHER_FRAGMENT = /* glsl */ `
uniform float uProgress;
uniform float uBreak;
uniform float uFade;
uniform float uTime;
uniform vec3 uTap;
uniform vec3 uAccent;
uniform vec3 uVoid;

${PIXEL_DISSOLVE_GLSL}

vec3 sampleScene(vec2 uv, float split) {
  if (split < 1e-5) return texture2D(inputBuffer, uv).rgb;
  return vec3(
    texture2D(inputBuffer, uv + vec2(split, 0.0)).r,
    texture2D(inputBuffer, uv).g,
    texture2D(inputBuffer, uv - vec2(split, 0.0)).b
  );
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;

  // BREAK tearing: a few rows slide sideways for a frame or two.
  float row = floor(px.y / 6.0);
  float tear = step(0.985, hash12(vec2(row, floor(uTime * 12.0)))) * (hash12(vec2(row, 1.3)) - 0.5);
  vec2 sampleUv = uv + vec2(tear * 0.04 * uBreak, 0.0);

  // Stepped cell size: 2, 4, 8, 16, 32 px. Grows fast so even a short burst
  // reads as pixels rather than static.
  float cellSize = exp2(min(dissolveLevel(uProgress, 8.0), 4.0) + 1.0);
  vec2 cell = floor(px / cellSize);
  if (uProgress > 0.0) sampleUv = (cell + 0.5) * cellSize / resolution;

  // A press sends one ring of coarse pixels out from under the pointer.
  float ring = 0.0;
  if (uTap.z < 0.75) {
    vec2 fromTap = (uv - uTap.xy) * vec2(resolution.x / resolution.y, 1.0);
    float radius = 0.02 + uTap.z * 0.5;
    ring = (1.0 - smoothstep(0.0, 0.03, abs(length(fromTap) - radius))) * (1.0 - uTap.z / 0.75);
    if (ring > 0.02) sampleUv = (floor(px / 8.0) + 0.5) * 8.0 / resolution;
  }

  float split = (uBreak * 1.6 + uProgress * 6.0 + ring * 3.0) * texelSize.x;
  bool untouched = uProgress <= 0.0 && uBreak <= 0.0 && ring <= 0.02;
  vec3 color = untouched ? inputColor.rgb : sampleScene(sampleUv, split);

  if (uProgress > 0.0) {
    // Bright cells hold on a little longer than dark ones.
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    // Mostly ordered Bayer: a structured halftone falling apart, not TV noise.
    float threshold = dissolveThreshold(cell, 0.15) + luma * 0.15;
    vec2 mask = dissolveMask(threshold, uProgress * 1.15, 0.08);
    color = mix(uVoid, color, mask.x);
    color = mix(color, uAccent * 1.2, mask.y * 0.7);
  }

  if (uBreak > 0.0) {
    // Red ordered-halftone creeping into the shadows.
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float dots = step(bayer4(px * 0.5) * 0.35, luma) * (1.0 - smoothstep(0.05, 0.3, luma));
    color += uAccent * dots * 0.05 * uBreak;
  }

  color += uAccent * ring * 0.1;

  // Film grain (both modes) and a soft vignette.
  float grain = hash12(px + fract(uTime * 7.0) * 100.0) - 0.5;
  color += grain * 0.016;
  vec2 v = uv * (1.0 - uv);
  color *= mix(0.62, 1.0, pow(clamp(v.x * v.y * 15.0, 0.0, 1.0), 0.32));

  color = mix(color, uVoid, uFade);
  outputColor = vec4(color, inputColor.a);
}
`;
