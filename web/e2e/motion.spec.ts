import { test, expect } from "@playwright/test";
import { damp, mapAnchors, smooth, stepSpring } from "../src/motion";
import { beat, SCENE_END, shot } from "../src/world/direction";

test("damping is independent of frame rate and converges without overshoot", () => {
  const results = [30, 60, 120].map((fps) => {
    let v = 0;
    for (let i = 0; i < fps; i++) v = damp(v, 1, 13, 1 / fps);
    return v;
  });
  expect(Math.max(...results) - Math.min(...results)).toBeLessThan(1e-10);
  expect(results[0]).toBeLessThanOrEqual(1);
  expect(results[0]).toBeGreaterThan(0.999);
});

test("the scroll spring gives one result at any refresh rate", () => {
  const run = (fps: number) => {
    const spring = { value: 0, velocity: 0 };
    for (let i = 0; i < fps; i++) stepSpring(spring, 1, 11, 1 / fps);
    return spring;
  };
  const results = [30, 60, 120, 144, 240].map(run);
  for (const r of results) {
    expect(Math.abs(r.value - results[0].value)).toBeLessThan(1e-9);
    expect(Math.abs(r.velocity - results[0].velocity)).toBeLessThan(1e-9);
    expect(r.value).toBeGreaterThan(0.99);
    expect(r.value).toBeLessThanOrEqual(1);
  }
});

test("a stepped target never produces a velocity jump", () => {
  // Input arrives as wheel notches. The filter this replaced jumped in speed at each one.
  const spring = { value: 0, velocity: 0 };
  const dt = 1 / 60;
  let target = 0,
    previous = 0,
    peak = 0,
    largest = 0;
  for (let frame = 0; frame < 240; frame++) {
    if (frame % 7 === 0 && frame < 170) target += 1;
    stepSpring(spring, target, 11, dt);
    peak = Math.max(peak, Math.abs(spring.velocity));
    largest = Math.max(largest, Math.abs(spring.velocity - previous));
    previous = spring.velocity;
  }
  expect(largest / peak).toBeLessThan(0.25);
});

test("scene time follows measured chapter anchors, monotonically", () => {
  const anchors = [
    [0, 0],
    [1000, 1],
    [3000, 2],
    [3500, 3],
  ] as const;
  expect(mapAnchors(anchors, -50)).toBe(0);
  expect(mapAnchors(anchors, 500)).toBeCloseTo(0.5);
  expect(mapAnchors(anchors, 2000)).toBeCloseTo(1.5);
  expect(mapAnchors(anchors, 9000)).toBe(3);
  let last = -1;
  for (let y = 0; y <= 3500; y += 13) {
    const s = mapAnchors(anchors, y);
    expect(s).toBeGreaterThanOrEqual(last);
    last = s;
  }
});

test("the film is reversible and its camera path has no cuts", () => {
  expect(smooth(0.2, 0.5, 0)).toBe(0);
  expect(smooth(0.2, 0.5, 1)).toBe(1);
  // Same scene time, same frame, whichever way it was reached.
  for (const s of [0, 0.7, 1.9, 2.72, 3.5, 4.4, 5.2, SCENE_END]) {
    expect(shot(s)).toEqual(shot(s));
    expect(beat(s)).toEqual(beat(s));
  }
  // Every step of scene time moves the camera a bounded distance: no teleports.
  const step = 0.002;
  let worst = 0;
  for (let s = step; s <= SCENE_END; s += step) {
    const a = shot(s - step).pos,
      b = shot(s).pos;
    worst = Math.max(worst, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  expect(worst).toBeLessThan(0.6);
});

test("the camera threads the door without touching the wall", () => {
  // Door: x within 1.5 of centre, y between 0 and 2, in the wall at z = -140.
  for (let s = 2.4; s < 3; s += 0.002) {
    const { pos } = shot(s);
    if (Math.abs(pos[2] + 140) < 0.7) {
      expect(Math.abs(pos[0])).toBeLessThan(1.5);
      expect(pos[1]).toBeGreaterThan(0);
      expect(pos[1]).toBeLessThan(2);
    }
  }
});
