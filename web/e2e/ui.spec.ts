import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Explicitly synthetic network fixtures for frontend safety/state regressions.
// Real Vultr, sandbox and native WooCommerce journeys remain in rehearsal.spec.ts.
const id = "abcdef0123456789abcdef0123456789";
const upload = {
  id,
  state: "mapping",
  tables: {
    baseline: {
      headers: ["Type", "SKU", "Name", "Regular price", "Stock"],
      rows: [["simple", "00017", "Bracket", "12.30", "4"]],
    },
    supplier: {
      headers: ["SKU", "Regular price", "Stock"],
      rows: [["00017", "13.5500", "7"]],
    },
  },
  candidates: {
    baseline: {
      type: ["Type"],
      sku: ["SKU"],
      name: ["Name"],
      price: ["Regular price"],
      stock: ["Stock"],
    },
    supplier: { sku: ["SKU"], price: ["Regular price"], stock: ["Stock"] },
  },
};
const report = {
  input_rows: 2,
  resolved_rows: 1,
  unresolved: [{ row: 2, sku: "UNKNOWN", reason: "SKU absent from baseline" }],
  attempts: [{ attempt: 1 }],
  changes: [
    {
      row: 1,
      sku: "00017",
      before: { price: "12.30", stock: "4" },
      after: { price: "13.5500", stock: "7" },
    },
  ],
};
async function files(page: Page) {
  await page.getByLabel("Baseline WooCommerce CSV").setInputFiles({
    name: "baseline.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("synthetic test"),
  });
  await page.getByLabel("Supplier CSV", { exact: true }).setInputFiles({
    name: "supplier.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("synthetic test"),
  });
  await page
    .getByRole("button", { name: "Upload and review mappings" })
    .click();
}

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

test("reduced motion and unavailable WebGL retain usable responsive controls", async ({
  browser,
}) => {
  for (const size of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width: size, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByTestId("brand-intro")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(`sessionStorage.setItem('shelfready:intro','seen');
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args);};`);
  await page.goto("/");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await expect(page.locator(".world-fallback")).toBeVisible();
  // Nothing to watch means no long empty scroll: chapters collapse to reading order.
  await expect
    .poll(() => page.locator("#verify").evaluate((el) => el.clientHeight))
    .toBeLessThan(900);
  await expect(
    page.getByRole("heading", {
      name: "Make the change. Keep the confidence.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload and review mappings" }),
  ).toBeDisabled();
  await context.close();
});

test("software WebGL gets the still frame, not a film that blocks input", async ({
  page,
}) => {
  await page.addInitScript(`sessionStorage.setItem('shelfready:intro','seen');
  const read = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function (name) {
    return name === 0x9246 ? "ANGLE (Google, SwiftShader Device, SwANGLE)" : read.call(this, name);
  };`);
  await page.goto("/");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(page.getByLabel("Baseline WooCommerce CSV")).toBeAttached();
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

test("each workflow stage lands the operator on its panel, not a stale offset", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("shelfready:intro", "seen"),
  );
  await page.route("**/api/jobs", (r) => r.fulfill({ json: upload }));
  await page.goto("/#studio");
  await expect(
    page.getByRole("heading", { name: "Two files. One controlled rehearsal." }),
  ).toBeInViewport();
  await files(page);
  await expect(
    page.getByRole("heading", { name: "Make the meaning explicit." }),
  ).toBeInViewport();
  await expect(page.locator("#process")).toHaveCount(0);
});

test.describe("synthetic workflow boundaries", () => {
  test.use({ reducedMotion: "reduce" });
  test("requires fresh consent after changing mappings; no execution before confirmation", async ({
    page,
  }) => {
    let confirmations = 0;
    await page.route("**/api/jobs", (r) => r.fulfill({ json: upload }));
    await page.route(`**/api/jobs/${id}/confirm`, (r) => {
      confirmations++;
      return r.fulfill({ json: { state: "queued" } });
    });
    await page.route(`**/api/jobs/${id}`, (r) =>
      r.fulfill({ json: { id, state: "running", report: null } }),
    );
    await page.goto("/");
    await files(page);
    const confirm = page.getByRole("button", { name: "Confirm and rehearse" });
    await expect(confirm).toBeDisabled();
    expect(confirmations).toBe(0);
    const consent = page.getByLabel("I confirm these mappings", {
      exact: false,
    });
    await consent.check();
    await expect(confirm).toBeEnabled();
    await page
      .getByLabel("supplier price", { exact: true })
      .selectOption("Stock");
    await expect(consent).not.toBeChecked();
    await consent.check();
    await expect(confirm).toBeDisabled();
    await page
      .getByLabel("supplier price", { exact: true })
      .selectOption("Regular price");
    await expect(consent).not.toBeChecked();
    await consent.check();
    await confirm.click();
    expect(confirmations).toBe(1);
    await expect(page.getByTestId("state")).toHaveText(/queued|running/);
    await expect(
      page.getByRole("link", { name: "Download verified CSV" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Awaiting backend completion", { exact: false }),
    ).toBeVisible();
  });
  test("failed verification never exposes downloads or stale verified tables", async ({
    page,
  }) => {
    await page.addInitScript(
      (id) => sessionStorage.setItem("shelfready:job", id),
      id,
    );
    await page.route(`**/api/jobs/${id}`, (r) =>
      r.fulfill({
        json: {
          id,
          state: "failed",
          report: { ...report, reason: "Synthetic native readback failure" },
        },
      }),
    );
    await page.goto("/");
    await expect(page.getByTestId("state")).toHaveText("failed");
    await expect(
      page.getByRole("link", { name: "Download verified CSV" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Verified replacements", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Synthetic native readback failure"),
    ).toBeVisible();
  });
  test("restores real terminal contract, preserves decimal strings and accounts for holds", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (id) => sessionStorage.setItem("shelfready:job", id),
      id,
    );
    await page.route(`**/api/jobs/${id}`, (r) =>
      r.fulfill({ json: { id, state: "partial", report } }),
    );
    await page.goto("/");
    await expect(page.getByTestId("state")).toHaveText("partial");
    await expect(
      page.getByRole("link", { name: "Download verified CSV" }),
    ).toHaveAttribute("href", `/api/jobs/${id}/download/csv`);
    await expect(
      page.getByRole("region", { name: "Verified replacements", exact: true }),
    ).toContainText("13.5500");
    await expect(
      page.getByRole("region", {
        name: "Unresolved supplier rows",
        exact: true,
      }),
    ).toContainText("UNKNOWN");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Start another rehearsal" }).click();
    expect(
      await page.evaluate(() => sessionStorage.getItem("shelfready:job")),
    ).toBeNull();
  });
  test("restoration failure preserves job reference and blocks an unchecked replacement", async ({
    page,
  }) => {
    await page.addInitScript(
      (id) => sessionStorage.setItem("shelfready:job", id),
      id,
    );
    let available = false;
    await page.route(`**/api/jobs/${id}`, (r) =>
      available
        ? r.fulfill({ json: { id, state: "partial", report } })
        : r.fulfill({ status: 503, json: { detail: "Synthetic outage" } }),
    );
    await page.goto("/");
    await expect(
      page.getByText("Your rehearsal reference is safe."),
    ).toBeVisible();
    expect(
      await page.evaluate(() => sessionStorage.getItem("shelfready:job")),
    ).toBe(id);
    await expect(
      page.getByRole("button", { name: "Upload and review mappings" }),
    ).toHaveCount(0);
    available = true;
    await page
      .getByRole("button", { name: "Retry previous rehearsal" })
      .click();
    await expect(page.getByTestId("state")).toHaveText("partial");
  });
});

test("accessible landing, mapping and verified-result surfaces", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/jobs", (r) => r.fulfill({ json: upload }));
  await page.route(`**/api/jobs/${id}/confirm`, (r) =>
    r.fulfill({ json: { state: "queued" } }),
  );
  await page.route(`**/api/jobs/${id}`, (r) =>
    r.fulfill({ json: { id, state: "partial", report } }),
  );
  await page.goto("/");
  for (const stage of ["landing", "mapping", "result"]) {
    if (stage === "mapping") await files(page);
    if (stage === "result") {
      await page
        .getByLabel("I confirm these mappings", { exact: false })
        .check();
      await page.getByRole("button", { name: "Confirm and rehearse" }).click();
      await expect(page.getByTestId("state")).toHaveText("partial");
    }
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      stage,
    ).toEqual([]);
  }
});
