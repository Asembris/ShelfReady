import { catmull, clamp, lerp, smooth } from "../motion";

/**
 * The film's direction, as a pure function of scene time.
 *
 * Whole numbers are the chapters the page anchors to:
 * 0 hall · 1 rumor · 2 hold · 3 rehearse · 4 verify · 5 release · 6 studio.
 * Nothing here reads a clock or accumulates, so scrubbing backwards is exact.
 */
export const SCENE_END = 6;
export const WALL_Z = -140;
export const SLOT = { width: 3, height: 2 } as const; // The brand notch's 12:8 proportion.

type Key = {
  s: number;
  pos: readonly [number, number, number];
  at: readonly [number, number, number];
  fov: number;
  roll?: number;
  /** Fraction of the frame the subject is offset, leaving the copy's side quiet. */
  shift?: readonly [number, number];
};

const KEYS: Key[] = [
  { s: 0, pos: [0, 1.1, 20], at: [0, 3, -140], fov: 40 },
  { s: 0.5, pos: [0.5, 1.5, 3], at: [0, 3, -140], fov: 42, shift: [-0.08, 0] },
  {
    s: 1,
    pos: [1.7, 3.5, -30],
    at: [-1.4, 2.5, -120],
    fov: 50,
    roll: -0.2,
    shift: [-0.18, 0],
  },
  {
    s: 1.5,
    pos: [-1.1, 5.4, -70],
    at: [0, 3.1, -130],
    fov: 44,
    roll: 0.1,
    shift: [0.06, 0],
  },
  { s: 2, pos: [0, 0.55, -111], at: [0, 6.1, -140], fov: 38 },
  { s: 2.28, pos: [1.7, 0.95, -125.8], at: [0.5, 1.45, -140], fov: 33 },
  { s: 2.56, pos: [1.25, 1, -134.6], at: [0, 1, -160], fov: 40 },
  { s: 2.78, pos: [0, 1, -141.5], at: [0, 1.2, -175], fov: 52 },
  { s: 3, pos: [0, 5, -152], at: [0, 1.5, -190], fov: 56, shift: [0, -0.04] },
  { s: 3.5, pos: [0, 78, -180], at: [0, 0, -191], fov: 44, shift: [0, 0] },
  {
    s: 4,
    pos: [-5.4, 1.75, -170.5],
    at: [-5.3, 1.75, -178],
    fov: 30,
    shift: [0.2, 0],
  },
  {
    s: 4.5,
    pos: [7.2, 1.75, -170.5],
    at: [7.3, 1.75, -178],
    fov: 30,
    shift: [0, 0],
  },
  {
    s: 4.72,
    pos: [3.4, 7.4, -171],
    at: [0, 11, -205],
    fov: 40,
    shift: [-0.1, 0],
  },
  { s: 5, pos: [-2, 10, -150], at: [-3, 15, -205], fov: 50, shift: [-0.16, 0] },
  { s: 5.5, pos: [0, 16, -168], at: [0, 25, -240], fov: 44, shift: [0, 0] },
  { s: 6, pos: [-8, 19, -184], at: [-24, 25, -205], fov: 42, shift: [0, 0] },
];

function locate(s: number) {
  const t = clamp(s, KEYS[0].s, KEYS[KEYS.length - 1].s);
  let i = 0;
  while (i < KEYS.length - 2 && t >= KEYS[i + 1].s) i++;
  return { i, u: (t - KEYS[i].s) / (KEYS[i + 1].s - KEYS[i].s) };
}

const key = (i: number) => KEYS[Math.max(0, Math.min(KEYS.length - 1, i))];

function curve(i: number, u: number, read: (k: Key) => number) {
  return catmull(
    read(key(i - 1)),
    read(key(i)),
    read(key(i + 1)),
    read(key(i + 2)),
    u,
  );
}

export type Shot = {
  pos: [number, number, number];
  at: [number, number, number];
  fov: number;
  roll: number;
  shift: [number, number];
};

export function shot(s: number): Shot {
  const { i, u } = locate(s);
  return {
    pos: [
      curve(i, u, (k) => k.pos[0]),
      curve(i, u, (k) => k.pos[1]),
      curve(i, u, (k) => k.pos[2]),
    ],
    at: [
      curve(i, u, (k) => k.at[0]),
      curve(i, u, (k) => k.at[1]),
      curve(i, u, (k) => k.at[2]),
    ],
    fov: curve(i, u, (k) => k.fov),
    roll: curve(i, u, (k) => k.roll ?? 0),
    shift: [
      curve(i, u, (k) => k.shift?.[0] ?? 0),
      curve(i, u, (k) => k.shift?.[1] ?? 0),
    ],
  };
}

/** Everything the scene does, derived from the same scene time as the camera. */
export function beat(s: number) {
  const dawn = smooth(4.8, 5.7, s);
  const rehearsal = smooth(2.66, 2.8, s);
  return {
    lights: lerp(lerp(0.78, 1, smooth(0.3, 1, s)), 0.12, smooth(1.5, 2, s)),
    lamp: 1 - smooth(0.25, 0.75, s),
    blade: smooth(3.64, 3.72, s) * (1 - smooth(4.54, 4.62, s)),
    river: smooth(0.24, 0.95, s),
    flowSpeed: smooth(0.3, 0.9, s) * (1 - smooth(1.45, 1.95, s)),
    calm: smooth(1.5, 2, s),
    funnel: smooth(2.2, 2.92, s),
    sort: smooth(2.72, 3.42, s),
    build: smooth(2.7, 3.45, s),
    scan: lerp(-34, 34, smooth(3.62, 4.62, s)),
    plates: smooth(3.72, 3.98, s) * (1 - smooth(4.62, 4.86, s)),
    burst: smooth(4.66, 5.62, s),
    sheet: smooth(4.74, 5.52, s),
    dawn,
    dim: smooth(5.55, 6, s),
    slotGlow: lerp(0.5, 2.2, smooth(0.9, 2, s)) * (1 - rehearsal),
    slotOpen: smooth(2.58, 2.74, s),
    flash: smooth(2.66, 2.74, s) * (1 - smooth(2.74, 2.83, s)),
    hallVisible: s < 2.86,
    chamberVisible: s > 2.3,
    figure: 1 - smooth(2.5, 2.62, s),
    fog: lerp(
      lerp(0.0125, 0.0056, rehearsal) +
        0.0075 * smooth(3.58, 3.95, s) * (1 - smooth(4.58, 4.86, s)),
      0.0034,
      dawn,
    ),
    rehearsal,
    bars: smooth(1.72, 2, s) * (1 - smooth(2.2, 2.42, s)),
    titleRehearse: smooth(3.1, 3.42, s) * (1 - smooth(3.68, 3.86, s)),
    titleVerify: smooth(3.8, 4.05, s) * (1 - smooth(4.55, 4.76, s)),
    titleRelease: smooth(5.05, 5.36, s) * (1 - smooth(5.5, 5.66, s)),
    labels: smooth(0.5, 0.8, s) * (1 - smooth(1.65, 1.95, s)),
  };
}
export type Beat = ReturnType<typeof beat>;
