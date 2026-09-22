import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/domain",
  outputDir: "./test-results-domain",
  reporter: "list",
  workers: 1
});
