/** Time-based exponential damping: equal elapsed time gives equal response at any refresh rate. */
export const damp = (
  current: number,
  target: number,
  rate: number,
  seconds: number,
) => target + (current - target) * Math.exp(-rate * seconds);
export function smooth(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
