import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";

const evidence = () => process.env.SHELFREADY_PUBLIC_EVIDENCE!;
test.beforeEach(async () => {
  await fs.mkdir(evidence(), { recursive: true });
});
async function scan(page: import("@playwright/test").Page, name: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await fs.writeFile(
    path.join(evidence(), name + "-accessibility.json"),
    JSON.stringify(
      {
        violations: result.violations,
        incomplete: result.incomplete.map((v) => ({
          id: v.id,
          description: v.description,
        })),
      },
      null,
      2,
    ),
  );
  expect(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test("authenticate, download synthetic inputs and rehearse through public HTTPS", async ({
  page,
  request,
  playwright,
  baseURL,
}) => {
  await fs.mkdir(evidence(), { recursive: true });
  const trace: unknown[] = [];
  page.on("response", (r) =>
    trace.push({
      time: new Date().toISOString(),
      method: r.request().method(),
      path: new URL(r.url()).pathname.replace(
        /\/api\/jobs\/[0-9a-f]{32}/g,
        "/api/jobs/[job]",
      ),
      status: r.status(),
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    // newContext inherits Playwright's configured defaults unless explicitly cleared.
    const anonymous = await playwright.request.newContext({
      baseURL,
      httpCredentials: undefined,
    });
    try {
      for (const route of [
        "/",
        "/demo/baseline.csv",
        "/api/jobs/missing",
        "/api/jobs/missing/download/csv",
      ]) {
        expect((await anonymous.get(route)).status()).toBe(401);
      }
    } finally {
      await anonymous.dispose();
    }
    for (const route of ["/docs", "/redoc", "/openapi.json"]) {
      expect((await request.get(route)).status()).toBe(404);
    }
    const inputs: Record<string, Buffer> = {};
    for (const name of ["baseline.csv", "update.csv"]) {
      const response = await request.get(`/demo/${name}`);
      expect(response.status()).toBe(200);
      inputs[name] = await response.body();
      expect(inputs[name].toString()).toBe(
        await fs.readFile(path.resolve("../fixtures", name), "utf8"),
      );
    }
    const denied = await request.post("/api/jobs", {
      headers: { Origin: "https://untrusted.invalid" },
      data: {},
    });
    expect(denied.status()).toBe(403);
    await page.goto("/");
    await page.getByLabel("Baseline WooCommerce CSV").setInputFiles({
      name: "baseline.csv",
      mimeType: "text/csv",
      buffer: inputs["baseline.csv"],
    });
    await page.getByLabel("Supplier CSV").setInputFiles({
      name: "update.csv",
      mimeType: "text/csv",
      buffer: inputs["update.csv"],
    });
    const [upload] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/jobs" &&
          r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Upload and review mappings" }).click(),
    ]);
    const job = await upload.json();
    const dir = evidence();
    await fs.writeFile(
      path.join(dir, "journey.json"),
      JSON.stringify({ origin: baseURL, job_id: job.id }, null, 2),
    );
    await expect(
      page.getByRole("button", { name: "Confirm and rehearse" }),
    ).toBeDisabled();
    await page.screenshot({ path: path.join(dir, "mapping-desktop.png") });
    await scan(page, "mapping");
    await page.getByLabel("I confirm these mappings", { exact: false }).check();
    await page.getByRole("button", { name: "Confirm and rehearse" }).click();
    await expect
      .poll(() => page.getByTestId("state").textContent(), { timeout: 230000 })
      .toMatch(/complete|partial|failed/);
    const status = await request.get(`/api/jobs/${job.id}`);
    expect(status.status()).toBe(200);
    await fs.writeFile(
      path.join(dir, "status.json"),
      JSON.stringify(await status.json(), null, 2),
    );
    await expect(page.getByTestId("state")).toHaveText("complete");
    await page.screenshot({ path: path.join(dir, "verified-desktop.png") });
    await scan(page, "verified");
    for (const [label, name] of [
      ["Download verified CSV", "verified.csv"],
      ["Download change report", "report.json"],
    ]) {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: label }).click(),
      ]);
      await download.saveAs(path.join(dir, name));
    }
    const csv = await fs.readFile(path.join(dir, "verified.csv"), "utf8");
    expect(csv).toContain("00017,13.55,7");
    expect(csv).toContain("A-2,1.35,2");
    const report = JSON.parse(
      await fs.readFile(path.join(dir, "report.json"), "utf8"),
    );
    expect(report.resolved_rows).toBe(2);
    expect(report.input_rows).toBe(2);
    expect(report.unresolved).toEqual([]);
    expect(report.persisted_readback).toEqual([
      ["00017", "13.55", "7", "Leading zero product"],
      ["A-2", "1.35", "2", "Decimal product"],
    ]);
    expect(errors).toEqual([]);
  } finally {
    // Deliberately omit headers, credentials, request bodies and capability URLs.
    await fs.writeFile(
      path.join(evidence(), "response-trace.json"),
      JSON.stringify(trace, null, 2),
    );
    await fs.writeFile(
      path.join(evidence(), "page-errors.json"),
      JSON.stringify(errors, null, 2),
    );
  }
});

test("hold unknown identifiers and deny unverified downloads without inference", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#studio");
  for (const [label, name] of [
    ["Baseline WooCommerce CSV", "baseline.csv"],
    ["Supplier CSV", "update.csv"],
  ]) {
    await page
      .getByLabel(label, { exact: true })
      .setInputFiles(path.resolve("../fixtures", name));
  }
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/jobs" &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Upload and review mappings" }).click(),
  ]);
  expect(response.status()).toBe(200);
  const job = await response.json();
  await page.getByLabel("supplier sku", { exact: true }).selectOption("Stock");
  await page.getByLabel("supplier stock", { exact: true }).selectOption("SKU");
  const confirm = page.getByRole("button", { name: "Confirm and rehearse" });
  await expect(confirm).toBeDisabled();
  const noConsent = await request.post(`/api/jobs/${job.id}/confirm`, {
    data: {
      baseline: {
        sku: "SKU",
        price: "Regular price",
        stock: "Stock",
        name: "Name",
        type: "Type",
      },
      supplier: { sku: "Stock", price: "Regular price", stock: "SKU" },
      replace_price_and_stock_same_currency: false,
    },
  });
  expect(noConsent.status()).toBe(422);
  await page.getByLabel("I confirm these mappings", { exact: false }).check();
  await confirm.click();
  await expect(page.getByTestId("state")).toHaveText("failed", {
    timeout: 15000,
  });
  const status = await (await request.get(`/api/jobs/${job.id}`)).json();
  await fs.writeFile(
    path.join(evidence(), "held-control.json"),
    JSON.stringify(status, null, 2),
  );
  expect(status.report.input_rows).toBe(2);
  expect(status.report.resolved_rows).toBe(0);
  expect(status.report.unresolved).toEqual([
    { row: 1, sku: "7", reason: "SKU absent from baseline" },
    { row: 2, sku: "2", reason: "SKU absent from baseline" },
  ]);
  expect(status.report.attempts).toBeUndefined();
  for (const kind of ["csv", "report"])
    expect(
      (await request.get(`/api/jobs/${job.id}/download/${kind}`)).status(),
    ).toBe(409);
  await expect(
    page.getByRole("link", { name: "Download verified CSV" }),
  ).toHaveCount(0);
  await page.screenshot({ path: path.join(evidence(), "held-desktop.png") });
  await scan(page, "held");
});

test("serve cinematic desktop and accessible responsive fallbacks over HTTPS", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    httpCredentials: {
      username: process.env.DEMO_USER!,
      password: process.env.DEMO_PASSWORD!,
    },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      const w = window as unknown as { introIn?: number; introOut?: number };
      const intro = document.querySelector('[data-testid="brand-intro"]');
      if (intro && !w.introIn) w.introIn = performance.now();
      if (!intro && w.introIn && !w.introOut) {
        w.introOut = performance.now();
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(page.getByTestId("brand-intro")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: path.join(evidence(), "hero-desktop.png") });
  const opening = await page.evaluate(() => {
    const w = window as unknown as { introIn: number; introOut: number };
    return w.introOut - w.introIn;
  });
  expect(opening).toBeGreaterThan(2800);
  expect(opening).toBeLessThan(5000);
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const gaps: number[] = [];
        let last = performance.now();
        function frame(now: number) {
          gaps.push(now - last);
          last = now;
          if (gaps.length < 120) requestAnimationFrame(frame);
          else resolve(gaps);
        }
        requestAnimationFrame(frame);
      }),
  );
  const reached: Record<string, number> = {};
  for (const [index, id] of [
    "the-file",
    "your-decision",
    "rehearse",
    "verify",
    "release",
  ].entries()) {
    const copy = page.locator(`#${id}-copy`);
    await copy.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const focus = Number((el as HTMLElement).dataset.focus ?? 0.5);
      scrollTo({
        top: box.top + scrollY + box.height / 2 - innerHeight * focus,
        behavior: "instant",
      });
    });
    await expect
      .poll(() =>
        page
          .getByTestId("world")
          .evaluate((el) => Number((el as HTMLElement).dataset.sceneTime)),
      )
      .toBeCloseTo(index + 1, 1);
    await expect(copy).toHaveClass(/in-frame/);
    await expect(copy.locator(".ln > span").last()).toHaveCSS(
      "transform",
      "none",
    );
    await expect(copy.locator(".chapter-body")).toHaveCSS("opacity", "1");
    reached[id] = await page
      .getByTestId("world")
      .evaluate((el) => Number((el as HTMLElement).dataset.sceneTime));
    await page.screenshot({ path: path.join(evidence(), id + "-desktop.png") });
  }
  await fs.writeFile(
    path.join(evidence(), "chapter-positions.json"),
    JSON.stringify(reached, null, 2),
  );
  await page
    .getByRole("heading", { name: "Two files. One controlled rehearsal." })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence(), "studio-desktop.png") });
  await page.reload();
  await expect(page.getByTestId("brand-intro")).toHaveCount(0);
  await page
    .locator("canvas")
    .evaluate((c) =>
      (c as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext(),
    );
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
  await fs.writeFile(
    path.join(evidence(), "cinematic-timing.json"),
    JSON.stringify(
      { opening_ms: opening, raf_gaps_ms: frames, page_errors: errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  await context.close();
  for (const width of [320, 390, 768, 1440]) {
    const c = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      httpCredentials: {
        username: process.env.DEMO_USER!,
        password: process.env.DEMO_PASSWORD!,
      },
    });
    const p = await c.newPage();
    await p.goto("/#studio");
    await expect(
      p.getByRole("heading", { name: "Two files. One controlled rehearsal." }),
    ).toBeInViewport();
    await expect(p.locator("canvas")).toHaveCount(0);
    await expect(p.getByTestId("brand-intro")).toHaveCount(0);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: path.join(evidence(), `studio-reduced-${width}.png`),
    });
    await scan(p, `reduced-${width}`);
    await c.close();
  }
  const c = await browser.newContext({
    httpCredentials: {
      username: process.env.DEMO_USER!,
      password: process.env.DEMO_PASSWORD!,
    },
  });
  const p = await c.newPage();
  await p.addInitScript(
    `sessionStorage.setItem('shelfready:intro','seen');const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args);};`,
  );
  await p.goto("/");
  await expect(p.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await expect(p.locator(".world-fallback")).toBeVisible();
  await p.keyboard.press("Tab");
  await expect(
    p.getByRole("link", { name: "Skip to rehearsal studio" }),
  ).toBeFocused();
  await p.keyboard.press("Enter");
  await expect(
    p.getByRole("heading", { name: "Two files. One controlled rehearsal." }),
  ).toBeInViewport();
  await p.screenshot({ path: path.join(evidence(), "webgl-unavailable.png") });
  await c.close();
});
