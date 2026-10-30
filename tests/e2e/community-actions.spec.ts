import { expect, test } from "@playwright/test";

const storeUrl = "https://play.google.com/store/apps/details?id=com.martin.barbu";
const mapsUrl = "https://www.google.com/maps/search/?api=1&query=card+clubs+near+me";

test("club search opens Google Maps separately without changing local progress", async ({ page, context }) => {
  await context.route("https://www.google.com/maps/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Card clubs</h1>" }));
  await page.goto("/");
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  const location = page.url();
  const link = page.getByRole("link", { name: /Get out and play/ });
  await expect(link).toHaveAttribute("href", mapsUrl);
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(mapsUrl);
  await expect(page).toHaveURL(location);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(stored);
  await popup.close();
});

test("native club search uses the external opener and allows retry after failure", async ({ page, context }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, { isTauri: true, clubCalls: calls, __TAURI_INTERNALS__: {
      invoke: async (command: string) => {
        calls.push(command);
        if (command !== "open_card_clubs") throw new Error("Unexpected command");
        if (calls.length === 1) throw new Error("No browser");
      }
    } });
  });
  await page.goto("/");
  const link = page.getByRole("link", { name: /Get out and play/ });
  await link.click();
  await expect(page.getByRole("alert")).toContainText("Could not open Google Maps");
  await link.click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { clubCalls: string[] }).clubCalls)).toEqual(["open_card_clubs", "open_card_clubs"]);
  expect(context.pages()).toHaveLength(1);
});

test("sharing sends only the public Google Play link to the share sheet", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => {
      Object.assign(window, { sharedData: data });
    } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Share Barbu/ }).click();
  expect(await page.evaluate(() => (window as unknown as { sharedData: ShareData }).sharedData)).toEqual({
    title: "Barbu - The king of cards", text: "Learn and play classic card games with Barbu.", url: storeUrl
  });
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("cancelling the share sheet does not report an error or copy anything", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new DOMException("Cancelled", "AbortError"); } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Share Barbu/ }).click();
  await expect(page.getByRole("button", { name: /Share Barbu/ })).toBeEnabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByLabel("Google Play link")).toHaveCount(0);
});

test("unavailable share sheet offers an explicit copy fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new Error("Not supported"); } });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { Object.assign(window, { copiedLink: text }); } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Share Barbu/ }).click();
  await expect(page.getByRole("status")).toContainText("Sharing is unavailable");
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Link copied.");
  expect(await page.evaluate(() => (window as unknown as { copiedLink: string }).copiedLink)).toBe(storeUrl);
});

for (const denied of [false, true]) {
  test(`without Web Share, clipboard ${denied ? "denial offers a selectable link" : "copies the listing"}`, async ({ page }, info) => {
    await page.addInitScript(({ denied }) => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => {
        if (denied) throw new Error("Clipboard denied");
        Object.assign(window, { copiedLink: text });
      } } });
    }, { denied });
    await page.goto("/");
    await page.getByRole("button", { name: /Share Barbu/ }).click();
    await expect(page.getByRole("status")).toContainText(denied ? "Copy is unavailable" : "Link copied.");
    const link = page.getByLabel("Google Play link");
    await expect(link).toHaveValue(storeUrl);
    if (denied) {
      await link.focus();
      expect(await link.evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!)).toBe(storeUrl.length);
    } else {
      expect(await page.evaluate(() => (window as unknown as { copiedLink: string }).copiedLink)).toBe(storeUrl);
    }
    for (const width of [320, 360, 820]) {
      await page.setViewportSize({ width, height: 740 });
      await page.getByRole("region", { name: "Play with others" }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`community-${width}-${denied ? "fallback" : "copied"}.png`) });
    }
  });
}
