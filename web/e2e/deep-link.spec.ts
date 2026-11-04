import { test, expect } from "@playwright/test";
for (const motion of ["reduce", "no-preference"] as const) {
  test(`studio deep link survives delayed fonts, refresh and navigation (${motion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.addInitScript(() => {
      const read = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (String(type).includes("webgl")) return null;
        return read.call(this, type, ...args);
      };
    });
    let release!: () => void;
    let gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/*.woff2", async (route) => {
      await gate;
      await route.continue();
    });
    const panel = page.getByRole("heading", {
      name: "Two files. One controlled rehearsal.",
    });
    for (const refresh of [false, true]) {
      gate = new Promise<void>((resolve) => (release = resolve));
      if (refresh) await page.reload({ waitUntil: "domcontentloaded" });
      else await page.goto("/#studio", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".app-shell")).toBeAttached();
      expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
      release();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".app-shell")).toHaveClass(/is-ready/);
      await expect(panel).toBeInViewport();
    }
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".app-shell")).toHaveClass(/is-ready/);
    await page
      .getByRole("link", { name: "Open studio", exact: true })
      .first()
      .click();
    await expect(panel).toBeInViewport();
  });
}
