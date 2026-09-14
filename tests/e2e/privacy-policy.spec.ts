import { expect, test, type Page } from "@playwright/test";

const policyUrl = "https://martingull.github.io/barbu/privacy-policy.html";

async function mockNativeOpener(page: Page, failFirst = false) {
  await page.addInitScript(({ failFirst }) => {
    const calls: string[] = [];
    Object.assign(window, {
      isTauri: true,
      privacyOpenCalls: calls,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          calls.push(command);
          if (command !== "open_privacy_policy") throw new Error(`Unexpected command: ${command}`);
          if (failFirst && calls.length === 1) throw new Error("Browser unavailable");
        }
      }
    });
  }, { failFirst });
}

async function nativeCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { privacyOpenCalls: string[] }).privacyOpenCalls);
}

test("Privacy policy opens a separate tab in browser mode", async ({ page, context }) => {
  await context.route(policyUrl, (route) => route.fulfill({
    contentType: "text/html",
    body: "<h1>Barbu Privacy Policy</h1>"
  }));
  await page.goto("/");
  const link = page.getByRole("link", { name: "Privacy policy", exact: true });
  await expect(link).toHaveAttribute("href", policyUrl);
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(policyUrl);
  await expect(popup.getByRole("heading", { name: "Barbu Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a table" })).toBeVisible();
  await popup.close();
});

test("Privacy policy uses the native opener without navigating the game", async ({ page, context }) => {
  await mockNativeOpener(page);
  await page.goto("/");
  const location = page.url();
  const link = page.getByRole("link", { name: "Privacy policy", exact: true });
  await link.click();
  await expect.poll(() => nativeCalls(page)).toEqual(["open_privacy_policy"]);
  await expect(link).toHaveAttribute("aria-busy", "false");
  await expect(page).toHaveURL(location);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(context.pages()).toHaveLength(1);
});

test("Privacy policy opening failure is visible and can be retried", async ({ page }, info) => {
  await mockNativeOpener(page, true);
  await page.goto("/");
  const link = page.getByRole("link", { name: "Privacy policy", exact: true });
  await link.click();
  await expect(page.getByRole("alert")).toContainText("Could not open your browser");
  await expect(page.getByRole("alert")).toContainText(policyUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("privacy-opening-error.png"), fullPage: true });

  await link.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => nativeCalls(page)).toEqual(["open_privacy_policy", "open_privacy_policy"]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(link).toHaveAttribute("aria-busy", "false");
});
