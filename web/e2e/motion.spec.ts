import { test, expect } from "@playwright/test";
import { damp, smooth } from "../src/motion";
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
test("choreography windows clamp and reverse deterministically", () => {
  expect(smooth(0.2, 0.5, 0)).toBe(0);
  expect(smooth(0.2, 0.5, 1)).toBe(1);
  const forward = [0, 0.1, 0.3, 0.5, 0.8, 1].map((p) => smooth(0.2, 0.5, p));
  expect(
    [1, 0.8, 0.5, 0.3, 0.1, 0].map((p) => smooth(0.2, 0.5, p)).reverse(),
  ).toEqual(forward);
});
