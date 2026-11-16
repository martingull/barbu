import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Opt-in preview coverage; the regular suite still verifies the released catalog.
process.env.VITE_CANASTA_PREVIEW = "1";
export default defineConfig({
  ...base,
  testMatch: /canasta.*\.spec\.ts/,
  use: { ...base.use, baseURL: "http://127.0.0.1:1421" },
  webServer: {
    command: "VITE_CANASTA_PREVIEW=1 npm run dev -- --host 127.0.0.1 --port 1421",
    url: "http://127.0.0.1:1421", reuseExistingServer: true, timeout: 30000
  }
});
