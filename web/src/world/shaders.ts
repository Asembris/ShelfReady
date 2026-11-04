/** GLSL for The Archive. All instance motion is a pure function of uniforms: no per-frame CPU buffers. */

const AIR = /* glsl */ `
uniform vec3 uCam;
uniform vec3 uFogColor;
uniform float uFog;
uniform vec3 uSlot;
uniform float uSlotGlow;
uniform float uReveal;
vec3 atmosphere(vec3 color, vec3 world) {
  vec3 ray = world - uCam;
  float dist = length(ray);
  float amount = 1.0 - exp(-dist * dist * uFog * uFog);
  vec3 toSlot = normalize(uSlot - uCam);
  float cosine = max(dot(ray / dist, toSlot), 0.0);
  float halo = pow(cosine, 90.0) + pow(cosine, 900.0) * 2.5;
  vec3 air = uFogColor + uSlotGlow * vec3(0.05, 0.1, 0.36) * halo;
  return mix(color, air, amount) * uReveal;
}
`;

const ROTATE = /* glsl */ `
mat3 rotation(vec3 a) {
  vec3 s = sin(a), c = cos(a);
  return mat3(
    c.y * c.z, c.y * s.z, -s.y,
    s.x * s.y * c.z - c.x * s.z, s.x * s.y * s.z + c.x * c.z, s.x * c.y,
    c.x * s.y * c.z + s.x * s.z, c.x * s.y * s.z - s.x * c.z, c.x * c.y
  );
}
`;

/** The hall: thousands of upright records, shelf boards and uprights in one draw call. */
export const recordVertex = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iSize;
attribute vec4 iData;
uniform float uMirror;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vData;
void main() {
  vec3 world = iPos + position * iSize;
  vLocal = position;
  vNormal = normal;
  vData = iData;
  vWorld = world;
  if (uMirror > 0.5) { world.y *= -1.15; vNormal.y *= -1.0; }
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
export const recordFragment = /* glsl */ `
precision highp float;
${AIR}
uniform float uLights;
uniform vec3 uLamp;
uniform float uLampK;
uniform float uTime;
uniform float uMirror;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vData;
void main() {
  float seed = vData.x;
  float board = vData.y;
  vec3 N = normalize(vNormal);
  vec3 albedo = mix(vec3(0.052, 0.074, 0.16), vec3(0.12, 0.155, 0.27), seed);
  albedo = mix(albedo, vec3(0.03, 0.04, 0.078), board);

  float pool = pow(0.5 + 0.5 * cos(vWorld.z * 0.3491), 5.0);
  vec3 toStrip = normalize(vec3(-vWorld.x, 16.0 - vWorld.y, 0.0));
  float strip = max(dot(N, toStrip), 0.0);
  float height = smoothstep(0.0, 13.0, vWorld.y);
  vec3 color = albedo * (0.022 + strip * uLights * (0.08 + pool * 2.1) * (0.25 + 0.75 * height));

  vec3 toLamp = uLamp - vWorld;
  float lampFall = 1.0 / (1.0 + dot(toLamp, toLamp) * 0.42);
  float lamp = uLampK * max(dot(N, normalize(toLamp)), 0.0) * lampFall;
  color += (albedo * 11.0 + vec3(0.02, 0.03, 0.05)) * lamp;

  // Index tabs on aisle-facing faces: a filing system, legible only as texture.
  float faces = step(0.5, abs(N.x)) * (1.0 - board);
  float tab = smoothstep(0.034, 0.022, abs(vLocal.y - (vData.z - 0.5) * 0.7));
  float lit = step(0.72, vData.w);
  float flicker = 0.8 + 0.2 * sin(uTime * (0.5 + seed * 1.7) + seed * 40.0);
  vec3 tabColor = mix(vec3(0.42, 0.55, 1.0), vec3(0.95, 0.96, 1.0), step(0.86, vData.w));
  float reach = uLights * (0.1 + 0.5 * (0.12 + pool)) + lamp * 16.0;
  color += tabColor * faces * tab * lit * flicker * reach;

  if (uMirror > 0.5) color *= 0.42;
  gl_FragColor = vec4(atmosphere(color, vWorld), 1.0);
}
`;

/** The wet floor: dark glass over the mirrored hall, with a light streak and the figure's shadow. */
export const worldVertex = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
export const floorFragment = /* glsl */ `
precision highp float;
${AIR}
uniform float uLights;
uniform vec3 uLamp;
uniform float uLampK;
uniform float uFigure;
varying vec3 vWorld;
float ripple(vec2 p) {
  return sin(p.x * 3.1 + sin(p.y * 0.7) * 1.7) * sin(p.y * 1.3 + p.x * 0.4);
}
void main() {
  float along = clamp((vWorld.z + 140.0) / 160.0, 0.0, 1.0);
  float wobble = ripple(vWorld.xz) * 0.11;
  float width = mix(1.55, 8.5, along);
  float offset = (vWorld.x + wobble) / width;
  float streak = exp(-offset * offset) * uSlotGlow;
  streak *= mix(0.9, 0.05, pow(along, 0.4));
  float shadow = 1.0;
  if (vWorld.z > -132.0) {
    float spread = 0.2 + (vWorld.z + 132.0) * 0.028;
    shadow = 1.0 - uFigure * 0.92 * smoothstep(spread, spread * 0.3, abs(vWorld.x));
  }
  vec3 color = vec3(0.26, 0.4, 1.0) * streak * shadow * 0.55;
  float pool = pow(0.5 + 0.5 * cos(vWorld.z * 0.3491), 7.0);
  color += vec3(0.1, 0.15, 0.36) * pool * uLights * exp(-vWorld.x * vWorld.x * 0.11) * 0.2;
  vec3 toLamp = uLamp - vWorld;
  color += vec3(0.42, 0.5, 0.75) * uLampK * 0.5 / (1.0 + dot(toLamp, toLamp) * 0.3);
  gl_FragColor = vec4(atmosphere(color, vWorld), 0.74);
}
`;

/** The wall: monumental, nearly lightless, washed only by its own door. */
export const wallFragment = /* glsl */ `
precision highp float;
${AIR}
varying vec3 vWorld;
void main() {
  float d = length(vec2(vWorld.x, (vWorld.y - 1.0) * 0.7));
  float wash = 0.2 / (1.0 + d * d * 0.55) * uSlotGlow;
  vec3 color = vec3(0.004, 0.006, 0.014) + vec3(0.1, 0.17, 0.5) * wash;
  gl_FragColor = vec4(atmosphere(color, vWorld), 1.0);
}
`;

export const doorFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
uniform float uReveal;
void main() {
  gl_FragColor = vec4(vec3(0.72, 0.8, 1.0) * uIntensity * uReveal, 1.0);
}
`;
export const spillFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
uniform float uReveal;
varying vec2 vUv;
void main() {
  float across = clamp(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0, 1.0);
  float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.8);
  float alpha = smoothstep(0.0, 1.0, across) * along * uIntensity * uReveal;
  gl_FragColor = vec4(vec3(0.3, 0.45, 1.0) * alpha, alpha);
}
`;

/** The supplier's rows: storm, frozen hold, door, shelf, scan, then one sheet. */
export const rowVertex = /* glsl */ `
attribute vec4 iR;
attribute vec4 iGrid;
attribute vec2 iSheet;
uniform float uFlow;
uniform float uRiver;
uniform float uCalm;
uniform float uFunnel;
uniform float uSort;
uniform float uScan;
uniform float uSheet;
uniform float uDepart;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying float vVerified;
varying float vFront;
varying float vHeld;
varying float vLanded;
${ROTATE}
void main() {
  float held = iGrid.w;
  float u = fract(iR.x + uFlow);
  vec3 storm = vec3((iR.y - 0.5) * 19.0, 0.9 + pow(iR.z, 1.25) * 15.0, mix(26.0, -130.0, u));
  storm.x += sin(u * 13.0 + iR.w * 6.28) * 1.5;
  storm.y += cos(u * 8.5 + iR.w * 9.0) * 0.9;
  // At the hold the storm hangs overhead, leaving a clear lane to the door.
  float lane = smoothstep(4.2, 0.0, abs(storm.x));
  storm.y += uCalm * lane * 3.4;
  storm.y += sin(uTime * 0.35 + iR.w * 6.28) * 0.05 * uCalm;

  float appear = smoothstep(iR.w * 0.72, iR.w * 0.72 + 0.28, uRiver);
  float funnel = smoothstep(iR.x * 0.68, iR.x * 0.68 + 0.32, uFunnel);
  float landed = smoothstep(iR.y * 0.62, iR.y * 0.62 + 0.38, uSort);

  vec3 door = vec3((iR.y - 0.5) * 2.5, 0.22 + iR.z * 1.55, -140.5);
  vec3 grid = iGrid.xyz;
  vec3 p = mix(mix(storm, door, funnel * funnel), grid, landed);

  // Verified rows condense upward into one file; held rows stay out, visibly, in their own group.
  float delay = fract(iR.z * 7.0) * 0.6;
  float rise = smoothstep(delay, delay + 0.4, uSheet) * (1.0 - held);
  if (held > 0.5) {
    vec3 group = vec3(21.5 + (iR.x - 0.5) * 3.2, 11.0 + (iR.y - 0.5) * 3.4, -198.0 + (iR.z - 0.5) * 2.0);
    p = mix(p, group, smoothstep(0.1, 0.8, uSheet));
  } else {
    // At the very end the finished file leaves for the horizon.
    float away = uDepart * uDepart;
    vec3 sheet = vec3(iSheet.x, 18.5 + iSheet.y + away * 15.0, -205.0 - away * 350.0);
    vec3 scatter = vec3(sin(iR.w * 40.0), 0.0, cos(iR.x * 40.0)) * sin(rise * 3.1416) * 3.4;
    p = mix(p, sheet, 1.0 - pow(1.0 - rise, 3.0)) + scatter;
  }

  float chaos = (1.0 - funnel) * (1.0 - uCalm * 0.55);
  vec3 angle = vec3((iR.y - 0.5) * 1.0, (iR.w - 0.5) * 2.4, (iR.x - 0.5) * 1.5) * max(chaos, (1.0 - landed) * 0.6);
  angle += vec3(sin(iR.z * 21.0) * rise * (1.0 - rise) * 5.0);

  vec3 size = vec3(mix(1.25, 1.45, landed) * mix(1.0, 0.075, rise), 0.03 * mix(1.0, 3.0, rise), mix(0.34, 0.72, landed) * mix(1.0, 0.1, rise));
  size *= appear * mix(1.0, 0.6, held * uSheet);
  // Too far to resolve as lines: the rows give way to the sheet's single light.
  size *= mix(1.0, 1.0 - smoothstep(0.72, 0.94, uDepart), 1.0 - held);

  mat3 turn = rotation(angle);
  vec3 world = turn * (position * size) + p;
  vWorld = world;
  vLocal = position;
  vNormal = turn * normal;
  float passed = uScan - grid.x;
  vHeld = held * smoothstep(0.0, 1.5, passed);
  vVerified = smoothstep(0.0, 1.0, passed) * (1.0 - held) * landed;
  vFront = exp(-passed * passed * 0.9) * landed;
  vLanded = landed;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
export const rowFragment = /* glsl */ `
precision highp float;
${AIR}
uniform float uCalm;
uniform float uSheet;
uniform float uTime;
uniform float uActive;
uniform float uFailed;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying float vVerified;
varying float vFront;
varying float vHeld;
varying float vLanded;
void main() {
  vec2 edge = abs(vLocal.xz) * 2.0;
  float rim = smoothstep(0.93, 1.0, max(edge.x, edge.y));
  float top = smoothstep(0.2, 0.9, abs(normalize(vNormal).y));
  vec3 cobalt = vec3(0.14, 0.27, 1.0);
  vec3 body = cobalt * (0.035 + top * 0.11) + vec3(0.3, 0.42, 1.0) * rim * 0.95;
  body = mix(body, cobalt * 0.05 + vec3(0.24, 0.32, 0.8) * rim * 0.34, uCalm * (1.0 - uSheet));
  vec3 ink = vec3(0.92, 0.95, 1.0);
  body = mix(body, cobalt * (0.07 + top * 0.26) + vec3(0.42, 0.56, 1.0) * rim * 0.8, vLanded * (1.0 - uSheet));
  body = mix(body, cobalt * 0.012 + ink * (top * 0.035 + rim * 0.62), vVerified);
  body = mix(body, ink * (0.82 + rim * 0.5), smoothstep(0.62, 1.0, uSheet) * (1.0 - vHeld));
  body = mix(body, vec3(1.0, 0.56, 0.1) * (0.5 + rim * 0.9), vHeld);
  body += ink * vFront * 0.5;
  // Ambient job state is an indeterminate sweep only. It never encodes progress.
  float sweep = pow(0.5 + 0.5 * sin(vWorld.y * 1.3 - uTime * 2.2), 8.0);
  body += ink * sweep * uActive * uSheet * 1.2;
  body = mix(body, body * vec3(1.0, 0.42, 0.14) * 0.7, uFailed * uSheet);
  gl_FragColor = vec4(atmosphere(body, vWorld), 1.0);
}
`;

/** The disposable store: racks that assemble on arrival and are demolished after the release. */
export const frameVertex = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iSize;
attribute vec4 iR;
uniform float uBuild;
uniform float uBurst;
varying vec3 vWorld;
varying vec3 vNormal;
${ROTATE}
void main() {
  float delay = iR.x * 0.7;
  float built = smoothstep(delay, delay + 0.3, uBuild);
  float eased = 1.0 - pow(1.0 - built, 3.0);
  vec3 p = mix(iPos + vec3(0.0, 24.0 + iR.y * 26.0, 0.0), iPos, eased);
  float b = max(0.0, uBurst - iR.w * 0.25) / 0.75;
  vec3 away = normalize(vec3(iPos.x + (iR.y - 0.5) * 8.0, 2.0 + iR.z * 3.0, iPos.z + 190.0 + (iR.x - 0.5) * 8.0));
  p += away * b * (22.0 + iR.z * 30.0);
  p.y -= b * b * (26.0 + iR.w * 34.0);
  mat3 turn = rotation((iR.xyz - 0.5) * 7.0 * b);
  vec3 world = turn * (position * iSize * built) + p;
  vWorld = world;
  vNormal = turn * normal;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
export const frameFragment = /* glsl */ `
precision highp float;
${AIR}
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float light = 0.2 + max(dot(normalize(vNormal), normalize(vec3(0.3, 1.0, 0.5))), 0.0) * 0.8;
  vec3 color = vec3(0.02, 0.04, 0.13) * light;
  color += vec3(0.1, 0.22, 0.95) * (1.0 - smoothstep(0.0, 3.0, vWorld.y)) * 0.06;
  gl_FragColor = vec4(atmosphere(color, vWorld), 1.0);
}
`;

/** Store floor: a luminous survey grid. It falls away with the demolition. */
export const chamberFragment = /* glsl */ `
precision highp float;
${AIR}
uniform float uBuild;
uniform float uBurst;
uniform float uScan;
varying vec3 vWorld;
float gridLine(float value, float pitch, float width) {
  float f = abs(fract(value / pitch - 0.5) - 0.5) * pitch;
  return smoothstep(width, 0.0, f);
}
void main() {
  float x = vWorld.x, z = vWorld.z;
  float grid = max(gridLine(x, 4.0, 0.03), gridLine(z, 4.0, 0.03)) * 0.42;
  grid += max(gridLine(x, 20.0, 0.09), gridLine(z, 20.0, 0.09)) * 0.9;
  vec2 c = vec2(x, z + 190.0);
  float edge = smoothstep(1.0, 0.82, max(abs(c.x) / 34.0, abs(c.y) / 48.0));
  float grown = smoothstep(0.0, 0.6, uBuild);
  vec3 color = vec3(0.002, 0.005, 0.018) + vec3(0.14, 0.3, 1.0) * grid * 0.42;
  float passed = uScan - x;
  color += vec3(0.8, 0.88, 1.0) * exp(-passed * passed * 26.0) * 0.8;
  float alpha = edge * grown * (1.0 - smoothstep(0.0, 0.45, uBurst));
  gl_FragColor = vec4(atmosphere(color, vWorld), alpha);
}
`;

/** Words set physically in the world, in the tradition of title sequences on architecture. */
export const typeFragment = /* glsl */ `
precision highp float;
${AIR}
uniform sampler2D uMap;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float a = texture2D(uMap, vUv).a * uOpacity;
  if (a < 0.003) discard;
  float dist = length(vWorld - uCam);
  float keep = exp(-dist * dist * uFog * uFog * 0.4);
  gl_FragColor = vec4(uTint * uReveal, a * keep);
}
`;

/** Dust makes the air visible. It wraps around the camera, so it costs nothing to keep near. */
export const dustVertex = /* glsl */ `
attribute vec4 iR;
uniform float uTime;
uniform vec3 uCam;
uniform float uPixel;
varying float vFade;
varying float vTwinkle;
void main() {
  vec3 box = vec3(30.0, 18.0, 44.0);
  vec3 drift = vec3(sin(uTime * 0.05 + iR.w * 6.28) * 2.0, uTime * (0.05 + iR.w * 0.1), uTime * 0.12);
  vec3 p = mod(iR.xyz * box + drift - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec4 view = viewMatrix * vec4(p, 1.0);
  float d = -view.z;
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(uPixel * (0.7 + iR.w * 1.8) * 9.0 / max(d, 0.5), 1.0, 22.0 * uPixel);
  vFade = smoothstep(1.0, 0.45, length((p - uCam) / box * 2.0)) * smoothstep(0.3, 2.2, d);
  vTwinkle = 0.55 + 0.45 * sin(uTime * (0.4 + iR.w) + iR.x * 30.0);
}
`;
export const dustFragment = /* glsl */ `
precision highp float;
uniform vec3 uDustColor;
uniform float uReveal;
varying float vFade;
varying float vTwinkle;
void main() {
  float a = smoothstep(1.0, 0.0, length(gl_PointCoord - 0.5) * 2.0);
  a = a * a * vFade * vTwinkle;
  gl_FragColor = vec4(uDustColor * a * uReveal, a);
}
`;

/** The sheet's luminous backing as verified rows condense into one file. */
export const sheetFragment = /* glsl */ `
precision highp float;
uniform float uIntensity;
uniform float uReveal;
uniform float uDepart;
varying vec2 vUv;
void main() {
  vec2 c = abs(vUv - 0.5) * 2.0;
  float far = smoothstep(0.72, 0.94, uDepart);
  float inside = smoothstep(1.0, 0.994, max(c.x, c.y));
  float edge = inside * smoothstep(0.975, 0.992, max(c.x, c.y));
  vec3 color = vec3(0.1, 0.13, 0.26) * inside * 0.22 + vec3(0.72, 0.8, 1.0) * edge * 0.9;
  color = mix(color, vec3(5.4, 6.0, 7.4) * inside, far); // Hot enough to bloom, like the door.
  float alpha = mix(inside * 0.22 + edge, inside, far);
  gl_FragColor = vec4(color * uIntensity * uReveal, alpha * uIntensity);
}
`;

/** The figure: dark, with only the rim light the door would give it. */
export const figureVertex = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
export const figureFragment = /* glsl */ `
precision highp float;
uniform float uSlotGlow;
varying vec3 vN;
void main() {
  float rim = pow(1.0 - abs(normalize(vN).z), 3.0);
  vec3 color = vec3(0.0009, 0.0014, 0.0032) + vec3(0.1, 0.14, 0.3) * rim * rim * uSlotGlow * 0.05;
  gl_FragColor = vec4(color, 1.0);
}
`;

export const plateFragment = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform vec3 uEdge;
varying vec2 vUv;
void main() {
  vec2 c = abs(vUv - 0.5) * 2.0;
  float edge = step(0.986, c.y) + step(0.996, c.x);
  vec3 color = mix(vec3(0.0024, 0.0052, 0.018), uEdge * 0.7, clamp(edge, 0.0, 1.0));
  gl_FragColor = vec4(color, uOpacity * 0.94);
}
`;

/** The scanner: a thin blade of light that crosses the store once. */
export const bladeFragment = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.0);
  float a = uOpacity * fall;
  gl_FragColor = vec4(vec3(0.5, 0.64, 1.0) * a, a);
}
`;

/** The flat, exact-color opening mark. Approved colors pass through untouched by the film's grade. */
export const flatVertex = /* glsl */ `
void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const flatFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
void main() { gl_FragColor = vec4(uColor, 1.0); }
`;

export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Dual-filter bloom: cheap, stable under motion, slightly widened for a lens-like streak. */
export const downFragment = /* glsl */ `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec2 o = uTexel;
  vec3 c = texture2D(uSource, vUv).rgb * 4.0;
  c += texture2D(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  c += texture2D(uSource, vUv + vec2(o.x, -o.y)).rgb;
  c += texture2D(uSource, vUv + vec2(-o.x, o.y)).rgb;
  c += texture2D(uSource, vUv + vec2(o.x, o.y)).rgb;
  c /= 8.0;
  if (uThreshold > 0.0) {
    float peak = max(c.r, max(c.g, c.b));
    if (!(peak < 1000.0)) c = vec3(0.0);
    peak = max(c.r, max(c.g, c.b));
    c *= smoothstep(uThreshold, uThreshold * 2.2, peak);
    c = min(c, vec3(12.0));
  }
  gl_FragColor = vec4(c, 1.0);
}
`;
export const upFragment = /* glsl */ `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uStretch;
varying vec2 vUv;
void main() {
  vec2 o = uTexel * vec2(uStretch, 1.0);
  vec3 c = vec3(0.0);
  c += texture2D(uSource, vUv + vec2(-2.0 * o.x, 0.0)).rgb;
  c += texture2D(uSource, vUv + vec2(2.0 * o.x, 0.0)).rgb;
  c += texture2D(uSource, vUv + vec2(0.0, -2.0 * o.y)).rgb;
  c += texture2D(uSource, vUv + vec2(0.0, 2.0 * o.y)).rgb;
  c += texture2D(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  c += texture2D(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  c += texture2D(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  c += texture2D(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  gl_FragColor = vec4(c / 12.0, 1.0);
}
`;

/** Final grade. Shadows resolve to the approved dark surface, so the page and film share one ground. */
export const compositeFragment = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomK;
uniform float uFlat;
uniform float uFade;
uniform float uFlash;
uniform float uBars;
uniform float uDim;
uniform float uDawn;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
const vec3 GROUND = vec3(0.00304, 0.00744, 0.02956); // Linear #0A1530.
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float grainAt(vec2 p, float t) {
  return fract(sin(dot(p + t, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec3 raw = texture2D(uScene, vUv).rgb;
  vec3 color = raw + texture2D(uBloom, vUv).rgb * uBloomK;
  color += vec3(0.5, 0.62, 1.0) * uFlash * 0.6;
  vec2 v = (vUv - 0.5) * vec2(min(uAspect, 1.6) / 1.6 + 0.4, 1.0);
  color *= mix(0.42, 1.0, smoothstep(0.92, 0.28, length(v) * 1.1));
  color *= 1.0 - uDim * 0.86;
  vec3 graded = aces(color);
  graded = mix(graded, graded * vec3(1.02, 1.0, 0.97), uDawn * 0.5);
  graded = GROUND + graded * (1.0 - GROUND);
  vec3 display = toSrgb(graded);
  display += (grainAt(gl_FragCoord.xy, mod(uTime * 24.0, 97.0)) - 0.5) * 0.022;
  display = mix(display, toSrgb(max(raw, GROUND)), uFlat);
  float bars = step(abs(vUv.y - 0.5), 0.5 - uBars * 0.105);
  display = mix(toSrgb(GROUND), display, bars * (1.0 - uFade));
  gl_FragColor = vec4(display, 1.0);
}
`;
