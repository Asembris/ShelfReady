import { test, expect } from "@playwright/test";

test("cinematic intro finishes once per tab session and supports skipping", async ({
  page,
}) => {
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      const intro = document.querySelector('[data-testid="brand-intro"]');
      const w = window as unknown as { __in?: number; __out?: number };
      if (intro && !w.__in) w.__in = performance.now();
      if (!intro && w.__in && !w.__out) {
        w.__out = performance.now();
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  // The bound is for a warmed GPU shader cache. Cold first visits are measured in the docs.
  await page.goto("/");
  await expect(page.getByTestId("brand-intro")).toBeHidden({ timeout: 15000 });
  await page.evaluate(() => sessionStorage.removeItem("shelfready:intro"));
  await page.reload();
  await expect(page.getByTestId("brand-intro")).toBeVisible();
  await expect(page.getByTestId("brand-intro")).toBeHidden({ timeout: 7000 });
  const opening = await page.evaluate(() => {
    const w = window as unknown as { __in: number; __out: number };
    return w.__out - w.__in;
  });
  expect(opening).toBeGreaterThan(2800);
  expect(opening).toBeLessThan(3500);
  await expect(
    page.getByRole("heading", {
      name: "Make the change. Keep the confidence.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("brand-intro")).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem("shelfready:intro"));
  await page.reload();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByTestId("brand-intro")).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem("shelfready:intro"));
  await page.reload();
  await expect(page.getByTestId("brand-intro")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("brand-intro")).toHaveCount(0);
});

test("draws a real world in one context and falls back after context loss", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("brand-intro")).toHaveCount(0, {
    timeout: 7000,
  });
  const world = page.getByTestId("world");
  await expect(world).toHaveAttribute("data-renderer", "webgl");
  await expect(page.locator("canvas")).toHaveCount(1);
  // Inspect presented pixels, rather than treating a canvas as proof of rendering.
  await expect
    .poll(async () => {
      const shot = await page.screenshot({ type: "jpeg", quality: 60 });
      return shot.length;
    })
    .toBeGreaterThan(40000);
  await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    gl!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(world).toHaveAttribute("data-renderer", "fallback");
  await expect(page.locator(".world-fallback")).toBeVisible();
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
});
