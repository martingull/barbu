import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Exercise the bundled JavaScript, not Vite's development-only access switch.
const preview = process.env.BARBU_PACKAGED_PREVIEW === "1";
const port = preview ? 1422 : 1423;
export default defineConfig({
  ...base,
  testMatch: preview ? /canasta.*\.spec\.ts/ : /catalog-availability\.spec\.ts/,
  outputDir: preview ? "test-results/packaged-preview" : "test-results/packaged-public",
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npm run preview -- --outDir ${preview ? "dist-canasta-preview" : "dist"} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 30000
  }
});
