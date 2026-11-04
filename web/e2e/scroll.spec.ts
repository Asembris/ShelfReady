import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("shelfready:intro", "seen"),
  );
});

const CHAPTERS = [
  ["the-file", "A supplier file is a rumor."],
  ["your-decision", "Nothing moves until you say so."],
  ["rehearse", "A store built to be thrown away."],
  ["verify", "A success message is not evidence."],
  ["release", "Only what was proven leaves."],
] as const;

const sceneTime = (page: import("@playwright/test").Page) =>
  page
    .getByTestId("world")
    .evaluate((el) => Number((el as HTMLElement).dataset.sceneTime));

/** Waits for the spring to arrive, using nothing but what the renderer reports. */
async function settle(page: import("@playwright/test").Page) {
  let previous = NaN;
  await expect
    .poll(
      async () => {
        const now = await sceneTime(page);
        const same = Math.abs(now - previous) < 0.0015;
        previous = now;
        return same;
      },
      { intervals: [150] },
    )
    .toBe(true);
  return previous;
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
  [360, 640],
]) {
  test(`film at actual scroll positions ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (/GL_INVALID|shader|THREE\.WebGL/i.test(m.text()))
        errors.push(m.text());
    });
    await page.goto("/");
    const world = page.getByTestId("world");
    await expect(world).toHaveAttribute("data-renderer", "webgl");
    await settle(page);
    const directory = path.resolve(
      "../artifacts/creative-review/round3/e2e",
      `${width}`,
    );
    await fs.mkdir(directory, { recursive: true });
    const documentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const frames = new Set<string>();
    const reached: Record<string, number> = {};
    for (const [index, [id, statement]] of CHAPTERS.entries()) {
      const copy = page.locator(`#${id}-copy`);
      await copy.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const focus = Number((el as HTMLElement).dataset.focus ?? 0.5);
        scrollTo({
          top: box.top + scrollY + box.height / 2 - innerHeight * focus,
          behavior: "instant",
        });
      });
      const s = await settle(page);
      // Words and picture are anchored together, at any viewport size.
      expect(s).toBeCloseTo(index + 1, 1);
      reached[id] = s;
      await page.waitForTimeout(1300); // Line masks finish their entrance.
      await expect(
        page.getByRole("heading", { name: statement }),
      ).toBeInViewport();
      const bounds = await copy.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
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
      const shot = await page.screenshot({
        path: path.join(directory, `${index + 1}-${id}.png`),
      });
      frames.add(shot.toString("base64"));
    }
    expect(frames.size).toBe(CHAPTERS.length);
    // Reversal: scrolling back to a chapter lands on the same scene time.
    const [backId] = CHAPTERS[1];
    await page.locator(`#${backId}-copy`).evaluate((el) => {
      const box = el.getBoundingClientRect();
      const focus = Number((el as HTMLElement).dataset.focus ?? 0.5);
      scrollTo({
        top: box.top + scrollY + box.height / 2 - innerHeight * focus,
        behavior: "instant",
      });
    });
    expect(await settle(page)).toBeCloseTo(reached[backId], 2);
    // Animation never disturbs document geometry, and one context serves the whole page.
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBe(documentHeight);
    await expect(page.locator("canvas")).toHaveCount(1);
    await page
      .locator(".handoff")
      .getByRole("link", { name: "Open studio" })
      .click();
    await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Every good update starts here." }),
    ).toBeInViewport({ timeout: 8000 });
    expect(errors).toEqual([]);
  });
}

test("the renderer rests once the opaque studio has settled", async ({
  page,
}) => {
  await page.goto("/#studio");
  const world = page.getByTestId("world");
  await expect(world).toHaveAttribute("data-renderer", "webgl");
  await expect(world).toHaveAttribute("data-running", "idle", {
    timeout: 12000,
  });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(world).toHaveAttribute("data-running", "live");
});

test("keyboard alone reaches every chapter and the studio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.locator("body").focus();
  const chapters = page
    .getByRole("navigation", { name: "Chapters" })
    .getByRole("link");
  await expect(chapters).toHaveCount(CHAPTERS.length + 2);
  await chapters.nth(4).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "A success message is not evidence." }),
  ).toBeInViewport({ timeout: 8000 });
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await page.getByRole("link", { name: "Skip to rehearsal studio" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Every good update starts here." }),
  ).toBeInViewport({ timeout: 8000 });
});

test("reduced motion exposes every explanation without a renderer or travel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const story = page.locator("#process");
  for (const [, statement] of CHAPTERS) {
    const heading = story.getByRole("heading", { name: statement });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    await expect(heading.locator(".ln > span").first()).toHaveCSS(
      "transform",
      "none",
    );
  }
  for (const name of ["Rehearse.", "Verify.", "Release."])
    await expect(story.getByText(name, { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".world-fallback")).toBeVisible();
  await page.getByRole("link", { name: "Skip to rehearsal studio" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Every good update starts here." }),
  ).toBeInViewport();
});
