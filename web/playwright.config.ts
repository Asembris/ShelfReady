import { defineConfig } from "@playwright/test";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const python =
  process.platform === "win32"
    ? path.join(root, ".venv/Scripts/python.exe")
    : path.join(root, ".venv/bin/python");
export default defineConfig({
  testDir: "e2e",
  testIgnore: "**/public.spec.ts",
  workers: 1,
  timeout: 240000,
  use: {
    baseURL: "http://127.0.0.1:18766",
    // The film only runs on a real GPU; software WebGL deliberately gets the still frame.
    launchOptions: {
      args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
    },
  },
  webServer: [
    {
      command: `"${python}" -m uvicorn shelfready.api:app --host 127.0.0.1 --port 18765`,
      cwd: root,
      url: "http://127.0.0.1:18765/docs",
      env: { SHELFREADY_DATA_DIR: path.join(root, ".runtime/ui-browser") },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:18766",
      reuseExistingServer: false,
    },
  ],
});
