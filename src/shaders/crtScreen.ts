import { PIXEL_DISSOLVE_GLSL } from "./pixelDissolve";

/**
 * The CRT glass.
 *
 * The terminal is drawn in greyscale on a 2D canvas (see terminalCanvas.ts).
 * This shader turns that canvas into a phosphor tube: barrel curvature, a
 * grid of phosphor cells, 4-level ordered dither of the brightness, scanlines,
 * a slow refresh roll, halo, glass reflection, the power-on squeeze, and the
 * pixel dissolve that opens the screen when the camera flies through it.
 */
export const CRT_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewDir;
varying vec3 vNormalV;

void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

export const CRT_FRAGMENT = /* glsl */ `
uniform sampler2D uContent;  // greyscale terminal canvas
uniform float uTime;
uniform float uPower;        // 0 → 1, CRT switching on
uniform float uDissolve;     // 0 → 1, glass dissolving as the camera arrives
uniform float uBreak;        // 0 = BUILD, 1 = BREAK
uniform float uAspect;       // screen width / height
uniform vec3 uPhosphor;      // current accent colour
uniform vec3 uGlass;         // unlit glass tint (background token)

varying vec2 vUv;
varying vec3 vViewDir;
varying vec3 vNormalV;

${PIXEL_DISSOLVE_GLSL}

const float ROWS = 230.0;    // phosphor cell rows at rest

// Bulge the picture like curved tube glass. Corners overflow and get masked.
vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + 0.045 * dot(c, c);
  return c * 0.5 + 0.5;
}

float inRect(vec2 uv) {
  vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return s.x * s.y;
}

void main() {
  vec2 uv = barrel(vUv);
  float onTube = inRect(uv);

  // Phosphor cells. They double in size in steps while the glass dissolves (up to 8×).
  float rows = ROWS / exp2(dissolveLevel(uDissolve, 3.0));
  vec2 grid = vec2(rows * uAspect, rows);
  vec2 cell = floor(uv * grid);
  vec2 cellUv = (cell + 0.5) / grid;

  // BREAK: random horizontal bands tear sideways.
  float band = floor(uv.y * 46.0);
  float tearOn = step(0.93, hash12(vec2(band, floor(uTime * 9.0))));
  float tear = tearOn * (hash12(vec2(band, 3.7)) - 0.5) * 0.07 * uBreak;

  // Power-on: the picture starts as a bright horizontal line and opens up.
  float openY = smoothstep(0.08, 0.75, uPower);
  float openX = smoothstep(0.0, 0.18, uPower);
  vec2 sampleUv = (cellUv - 0.5) / vec2(max(openX, 1e-3), max(openY, 4e-3)) + 0.5;
  sampleUv.x += tear;
  float onPicture = inRect(sampleUv);

  float lum = texture2D(uContent, sampleUv).r * onPicture;
  float halo = texture2D(uContent, sampleUv, 4.0).r * onPicture;
  // BREAK: a misregistered ghost of the picture, like a failing convergence.
  float ghost = texture2D(uContent, sampleUv + vec2(0.0045, -0.002)).r * onPicture * uBreak;

  // Four phosphor levels with ordered dither: greys become dot patterns.
  float level = floor(lum * 3.0 + bayer8(cell)) / 3.0;

  // Cell shape only shows when cells are big enough on screen; when they are
  // smaller than a few pixels it would alias into moiré, so fade it out.
  float cellPx = 1.0 / max(fwidth(uv.y * grid.y), 1e-4);
  float detail = smoothstep(2.5, 7.0, cellPx);
  vec2 f = fract(uv * grid) - 0.5;
  float dotShape = mix(1.0, 0.35 + 0.65 * smoothstep(0.62, 0.3, length(f)), detail);
  float scan = mix(1.0, 0.72 + 0.28 * cos(f.y * 6.2831), detail);

  vec3 col = uPhosphor * level * dotShape * scan * 1.55;
  col += uPhosphor * halo * 0.3;
  col += vec3(uPhosphor.b, uPhosphor.r, uPhosphor.g) * ghost * 0.55;

  // A slow brighter band rolls down the tube, plus mains flicker.
  float roll = smoothstep(0.1, 0.0, abs(fract(uv.y + uTime * 0.07) - 0.5) - 0.38);
  col *= 0.94 + 0.12 * roll;
  col *= 0.975 + 0.025 * sin(uTime * 113.0);

  // The thin bright line while the tube warms up.
  float line = (1.0 - openY) * smoothstep(0.012, 0.0, abs(uv.y - 0.5)) * step(0.02, uPower);
  col += uPhosphor * line * 3.0;

  // Unlit phosphor is never pure black.
  col += uGlass * 1.4 + uPhosphor * 0.018 * openY;

  // Darker towards the tube corners.
  vec2 v = uv * (1.0 - uv);
  col *= pow(clamp(v.x * v.y * 20.0, 0.0, 1.0), 0.3);

  // Glass: fresnel rim and one soft diagonal reflection of the room.
  float fresnel = pow(1.0 - clamp(dot(vNormalV, vViewDir), 0.0, 1.0), 3.0);
  float sheen = smoothstep(0.22, 0.0, abs(vUv.x * 0.8 + vUv.y - 1.42)) * 0.035;
  col += vec3(sheen) + uPhosphor * fresnel * 0.06;

  // Outside the curved picture: dark glass edge.
  col = mix(uGlass * 0.6 + vec3(sheen), col, onTube);

  // Pixel dissolve. The centre goes first so it reads as a portal opening.
  if (uDissolve > 0.0) {
    float radial = length((cellUv - 0.5) * vec2(uAspect, 1.0)) / length(vec2(uAspect, 1.0) * 0.5);
    float threshold = dissolveThreshold(cell, 0.35) * 0.62 + radial * 0.38;
    vec2 mask = dissolveMask(threshold, uDissolve * 1.04, 0.06);
    if (mask.x < 0.5) discard;
    col = mix(col, uPhosphor * 1.9, mask.y);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
