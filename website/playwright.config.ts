import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: '../test-results/website',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4178', screenshot: 'only-on-failure' },
  webServer: {
    command: 'python3 -m http.server 4178 --bind 127.0.0.1 --directory public',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'small-phone', use: { browserName: 'chromium', viewport: { width: 320, height: 568 } } },
    { name: 'android', use: { browserName: 'chromium', viewport: { width: 360, height: 740 } } },
    { name: 'safari-phone', use: { browserName: 'webkit', viewport: { width: 393, height: 852 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
});
