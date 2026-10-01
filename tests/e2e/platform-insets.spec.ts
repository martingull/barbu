import { expect, test } from "@playwright/test";

test.use({ userAgent: "Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36" });

for (const native of [false, true]) {
  test(`Android ${native ? "native container owns" : "browser retains"} the navigation inset`, async ({ page }) => {
    await page.addInitScript(value => Object.assign(window, { isTauri: value }), native);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Barbu", exact: true, level: 1 })).toBeVisible();
    const override = await page.evaluate(() => document.documentElement.style.getPropertyValue("--app-safe-area-bottom"));
    expect(override).toBe(native ? "" : "48px");
  });
}
