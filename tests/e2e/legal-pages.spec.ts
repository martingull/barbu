import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const pageName of ["privacy-policy", "terms-of-service"]) {
  test(`${pageName} explains Premium without overflowing small screens`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.setContent(readFileSync(new URL(`../../docs/${pageName}.html`, import.meta.url), "utf8"));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Barbu");
    await expect(page.getByRole("link", { name: "martin@insilicoveritas.org", exact: true }).first())
      .toHaveAttribute("href", "mailto:martin@insilicoveritas.org");
    await expect(page.locator("main")).toContainText("Google Play");
    await expect(page.locator("main")).toContainText("RevenueCat");
    if (pageName === "privacy-policy") {
      await expect(page.getByRole("heading", { name: "Purchases and Subscription Data" })).toBeVisible();
      await expect(page.getByRole("link", { name: "RevenueCat's privacy information" }))
        .toHaveAttribute("href", "https://www.revenuecat.com/privacy");
      await expect(page.locator("main")).toContainText("deletion of purchase-related data");
      await expect(page.locator("main")).not.toContainText("Barbu does not use this to transmit personal data");
    } else {
      await expect(page.locator("main")).toContainText("Uninstalling Barbu or deleting local data does not cancel a subscription");
      await expect(page.locator("main")).toContainText("whichever comes first");
      await expect(page.locator("main")).not.toContainText("has no advertising, subscriptions or in-app purchases");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${pageName}.png`), fullPage: true });
  });
}
