import { expect, test } from "@playwright/test";

test("judge replay identifies the recorded evidence and never uses the API", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("**/api/**", async (route) => {
    calls.push(route.request().method());
    await route.abort();
  });
  await page.goto("/#studio");
  await page.getByText("Verified replay · read-only evidence").click();
  await expect(
    page.getByText("Recorded on November 5, 2026", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Recorded SQL readback · price / stock" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "10 00017 12.30 / 4 13.55 / 7" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "11 A-2 0.10 / 0 1.35 / 2" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Source evidence and export checksums" }),
  ).toHaveAttribute(
    "href",
    /docs\/live-deployment\.md#verified-public-journey$/,
  );
  expect(calls).toEqual([]);
});

test("judge live upload explains exhausted allowance while replay remains available", async ({
  page,
}) => {
  await page.route("**/api/jobs", (route) =>
    route.fulfill({
      status: 429,
      json: { detail: "The live demo upload allowance is exhausted." },
    }),
  );
  await page.goto("/#studio");
  await page.getByLabel("Baseline WooCommerce CSV").setInputFiles({
    name: "baseline.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("test"),
  });
  await page.getByLabel("Supplier CSV", { exact: true }).setInputFiles({
    name: "update.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("test"),
  });
  await page
    .getByRole("button", { name: "Upload and review mappings" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "upload allowance is exhausted",
  );
  await page.getByText("Verified replay · read-only evidence").click();
  await expect(
    page.getByRole("table", { name: "Recorded SQL readback · price / stock" }),
  ).toBeVisible();
});
