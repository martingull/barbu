import { expect, test, type Page } from "@playwright/test";

async function mockBilling(page: Page, outcome = "purchased") {
  await page.addInitScript(({ outcome }) => {
    const w = window as any;
    w.isTauri = true;
    w.billingCalls = [];
    w.billingActive = false;
    w.__TAURI_INTERNALS__ = { invoke: async (command: string, args: any) => {
      if (command !== "plugin:barbu-purchases|request") return;
      w.billingCalls.push(args.operation);
      const customer = () => ({ verification: "verified", entitlement: "premium", active: w.billingActive,
        checkedAt: Date.now(), expiresAt: w.billingActive ? Date.now() + 86400000 : null, willRenew: w.billingActive });
      if (args.operation === "availability") return { available: true, purchasesEnabled: true };
      if (args.operation === "offers") return { offers: [
        { id: "monthly", price: "EUR 2.49", period: "month" }, { id: "annual", price: "EUR 19.99", period: "year" }
      ] };
      if (args.operation === "purchase") {
        if (outcome === "purchased") w.billingActive = true;
        return { outcome, ...(outcome === "purchased" ? { customer: customer() } : {}) };
      }
      if (args.operation === "restore") w.billingActive = true;
      return { customer: customer() };
    } };
  }, { outcome });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`Premium purchase, expiry and restore preserve Canasta at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockBilling(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Barbu Premium", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Subscribe for EUR 2.49 / month", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("premium-plans.png"), fullPage: true });
    await page.getByRole("button", { name: "Subscribe for EUR 2.49 / month", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Premium is active" })).toBeVisible();
    await page.getByRole("button", { name: "Table", exact: true }).click();
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await page.getByRole("tab", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Play Canasta", exact: true }).click();
    const drawStock = page.getByRole("region", { name: "Canasta decisions", exact: true })
      .getByRole("button", { name: "Draw stock", exact: true });
    await expect(drawStock).toBeVisible();
    const saved = await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"));
    expect(saved).not.toBeNull();
    await page.evaluate(() => { (window as any).billingActive = false; window.dispatchEvent(new Event("focus")); });
    await expect(page.getByRole("heading", { name: "Barbu Premium", exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toHaveClass(/fixed-play-screen/);
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"))).toBe(saved);
    await page.getByRole("button", { name: "Restore purchases", exact: true }).click();
    await expect(drawStock).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"))).toBe(saved);
    expect(errors).toEqual([]);
  });
}

test("Premium footer aligns with the catalog and separates the privacy link", async ({ page }, testInfo) => {
  await mockBilling(page);
  await page.goto("/");
  const footer = page.locator(".catalog-footer");
  for (const width of [320, 360, 820, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    const canasta = page.getByRole("button", { name: "Open Canasta", exact: true });
    await expect(canasta).toHaveAccessibleDescription("Premium");
    await expect(canasta.locator(".premium-badge")).toHaveText("Premium");
    await expect(page.getByRole("button", { name: "Open Gin Rummy", exact: true }).locator(".premium-badge")).toHaveCount(0);
    await canasta.scrollIntoViewIfNeeded();
    const cardBox = (await canasta.boundingBox())!;
    const badgeBox = (await canasta.locator(".premium-badge").boundingBox())!;
    expect(badgeBox.x).toBeGreaterThan(cardBox.x);
    expect(badgeBox.x + badgeBox.width).toBeLessThan(cardBox.x + cardBox.width);
    expect(badgeBox.y + badgeBox.height).toBeLessThan(cardBox.y + cardBox.height);
    await canasta.screenshot({ path: testInfo.outputPath(`premium-game-${width}.png`) });
    for (const active of [false, true]) {
      await page.evaluate(active => {
        (window as any).billingActive = active;
        window.dispatchEvent(new Event("focus"));
      }, active);
      const button = footer.getByRole("button", { name: active ? "Manage Premium" : "Premium", exact: true });
      await expect(button).toBeVisible();
      await button.scrollIntoViewIfNeeded();
      const buttonBox = (await button.boundingBox())!;
      const catalogBox = (await page.locator(".catalog-home").boundingBox())!;
      const privacyBox = (await footer.getByRole("link", { name: "Privacy policy" }).boundingBox())!;
      expect(Math.abs(buttonBox.x - catalogBox.x)).toBeLessThan(1);
      expect(Math.abs(buttonBox.width - catalogBox.width)).toBeLessThan(1);
      expect(buttonBox.height).toBeGreaterThanOrEqual(52);
      expect(privacyBox.y - buttonBox.y - buttonBox.height).toBeGreaterThanOrEqual(15);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`premium-footer-${width}.png`) });
  }
  await footer.getByRole("button", { name: "Manage Premium", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Premium is active", exact: true })).toBeVisible();
});

for (const outcome of ["pending", "cancelled"]) {
  test(`${outcome} checkout stays locked while free games remain usable`, async ({ page }) => {
    await mockBilling(page, outcome);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await page.getByRole("button", { name: "Subscribe for EUR 2.49 / month", exact: true }).click();
    await expect(page.getByText(outcome === "pending" ? "Payment is pending. Premium will unlock once payment is confirmed." : "Purchase cancelled.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Table", exact: true }).click();
    await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Barbu Premium", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Table", exact: true }).click();
    await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Learn", exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).billingCalls.filter((op: string) => op === "purchase").length)).toBe(1);
  });
}
