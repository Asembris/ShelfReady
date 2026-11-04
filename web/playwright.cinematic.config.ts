import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
if (process.env.CI)
  throw new Error(
    "Cinematic tests require a separately verified local hardware GPU; use playwright.ci.config.ts in CI.",
  );
export default defineConfig({
  ...base,
  testMatch: ["cinema.spec.ts", "scroll.spec.ts"],
});
