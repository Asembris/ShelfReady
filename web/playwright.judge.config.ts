import { defineConfig } from "@playwright/test";
import portable from "./playwright.ci.config";

export default defineConfig({
  ...portable,
  testMatch: "judge.spec.ts",
});
