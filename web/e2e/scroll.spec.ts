import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("shelfready:intro", "seen");
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new Error("Disabled in visual checks"));
    Element.prototype.setPointerCapture = () => {};
  });
});
for (const [width, height] of [
  [1440, 900],
  [390, 844],
  [360, 640],
]) {
  test(`proof passage at actual scroll positions ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page
      .locator(".app-shell")
      .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const story = page.locator("#process");
    const bounds = await story.evaluate((el) => ({
      top: el.getBoundingClientRect().top + scrollY,
      height: el.getBoundingClientRect().height,
    }));
    const directory = path.resolve("../artifacts/scroll-polish", `${width}`);
    await fs.mkdir(directory, { recursive: true });
    const signatures = new Set<string>();
    for (const [index, p] of [0, 0.18, 0.4, 0.56, 0.76, 1, 0.4].entries()) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: "instant" }),
        bounds.top + p * (bounds.height - height),
      );
      await expect(story).toHaveAttribute(
        "data-progress",
        new RegExp(`^${p.toFixed(2).slice(0, 3)}`),
      );
      await page.waitForTimeout(350);
      await expect(story.locator('[data-renderer="webgl"]')).toBeVisible();
      const beat = p < 0.32 ? "Rehearse." : p < 0.68 ? "Verify." : "Release.";
      await expect(
        story.getByRole("heading", { name: beat, exact: true }),
      ).toBeVisible();
      const copy = await story
        .locator(`.beat-${p < 0.32 ? 0 : p < 0.68 ? 1 : 2}`)
        .boundingBox();
      expect(copy!.y).toBeGreaterThanOrEqual(0);
      expect(copy!.y + copy!.height).toBeLessThanOrEqual(height);
      signatures.add(
        await story
          .locator("canvas")
          .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: path.join(directory, `${index}-${p}.png`),
      });
    }
    expect(signatures.size).toBeGreaterThan(4);
    const after = await story.evaluate((el) => ({
      top: el.getBoundingClientRect().top + scrollY,
      height: el.getBoundingClientRect().height,
    }));
    expect(after).toEqual(bounds);
    await story.getByRole("link", { name: "Open studio" }).click();
    await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("reduced motion exposes every explanation without pinned travel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const story = page.locator("#process");
  await expect(story).toHaveClass(/passage-static/);
  for (const name of ["Rehearse.", "Verify.", "Release."])
    await expect(
      story.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(story.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Skip to rehearsal studio" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeInViewport();
});
