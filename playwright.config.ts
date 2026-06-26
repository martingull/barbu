import { defineConfig, devices } from "@playwright/test";

const iPhoneXR = {
  ...devices["iPhone XR"],
  viewport: { width: 393, height: 852 }
};

const iPhone13 = {
  ...devices["iPhone 13"],
  viewport: { width: 390, height: 844 }
};

const iPhone16Curved = {
  ...devices["iPhone 15"],
  viewport: { width: 393, height: 852 }
};

const iPhone15ProMax = {
  ...devices["iPhone 15 Pro Max"],
  viewport: { width: 430, height: 932 }
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
    timeout: 30_000
  },
  projects: [
    {
      name: "iphone-xr",
      use: iPhoneXR
    },
    {
      name: "iphone-13",
      use: iPhone13
    },
    {
      name: "iphone-16",
      use: iPhone16Curved
    },
    {
      name: "iphone-15-pro-max",
      use: iPhone15ProMax
    }
  ]
});
