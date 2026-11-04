/** Pure motion primitives. No DOM, clock or renderer state lives here, so all of it is testable and reversible. */
export const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Time-based exponential damping: equal elapsed time gives equal response at any refresh rate. */
export const damp = (
  current: number,
  target: number,
  rate: number,
  seconds: number,
) => target + (current - target) * Math.exp(-rate * seconds);

export function smooth(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export type Spring = { value: number; velocity: number };

/**
 * Exact closed-form critically damped spring.
 *
 * A first-order filter's velocity jumps whenever its target jumps, so stepped
 * wheel input reads as a pulse per notch. This keeps velocity continuous, and
 * because the step is the analytic solution it stays identical at any refresh
 * rate rather than merely approximating it.
 */
export function stepSpring(
  spring: Spring,
  target: number,
  omega: number,
  seconds: number,
) {
  const offset = spring.value - target;
  const slope = spring.velocity + omega * offset;
  const decay = Math.exp(-omega * seconds);
  spring.value = target + (offset + slope * seconds) * decay;
  spring.velocity = (slope - omega * (offset + slope * seconds)) * decay;
}

export type Anchor = readonly [position: number, value: number];

/** Monotonic piecewise-linear map from measured document offsets to scene time. */
export function mapAnchors(anchors: readonly Anchor[], position: number) {
  if (!anchors.length) return 0;
  if (position <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [y, v] = anchors[i];
    if (position <= y) {
      const [py, pv] = anchors[i - 1];
      return lerp(pv, v, y === py ? 1 : (position - py) / (y - py));
    }
  }
  return anchors[anchors.length - 1][1];
}

/** Uniform Catmull-Rom through evenly addressed keys; continuous position and velocity. */
export function catmull(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t;
  return (
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (3 * b - a - 3 * c + d) * t2 * t)
  );
}
