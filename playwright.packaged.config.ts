import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Exercise the bundled JavaScript, not Vite's development-only access switch.
const preview = process.env.BARBU_PACKAGED_PREVIEW === "1";
const port = Number(process.env.BARBU_PACKAGED_PORT ?? (preview ? 1422 : 1423));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error("Invalid packaged test port");
export default defineConfig({
  ...base,
  testMatch: preview ? /(canasta.*|euchre.*|cribbage|ios-preview)\.spec\.ts/ : /catalog-availability\.spec\.ts/,
  outputDir: preview ? "test-results/packaged-preview" : "test-results/packaged-public",
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npm run preview -- --outDir ${preview ? "dist-canasta-preview" : "dist"} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 30000
  }
});
