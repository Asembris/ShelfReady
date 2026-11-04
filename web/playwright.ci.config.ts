import { defineConfig } from "@playwright/test";
// Exact portable suite. No worker, API, model key, Docker or GPU required.
export default defineConfig({
  testDir: "e2e",
  testMatch: ["ui.spec.ts", "motion.spec.ts"],
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 30000,
  reporter: [
    ["line"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:18766",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "npm exec -- vite preview --host 127.0.0.1 --port 18766 --strictPort",
    url: "http://127.0.0.1:18766",
    reuseExistingServer: false,
  },
});
