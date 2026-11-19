import { expect, test, type Page } from "@playwright/test";

const supportId = "$RCAnonymousID:0123456789abcdef0123456789abcdef";

async function mockBilling(page: Page, outcome = "purchased", options: { failCustomer?: boolean; active?: boolean; willRenew?: boolean; failSupportInfo?: boolean; failOffers?: boolean } = {}) {
  await page.addInitScript(({ outcome, options, supportId }) => {
    const w = window as any;
    w.isTauri = true;
    w.billingCalls = [];
    w.billingPurchasedIds = [];
    w.billingOffersFail = options.failOffers ?? false;
    w.billingActive = options.active ?? false;
    w.billingCustomerFails = options.failCustomer ?? false;
    w.billingWillRenew = options.willRenew ?? true;
    w.billingExpiresAt = Date.now() + 86400000;
    w.billingCustomerDeferred = false;
    w.billingCustomerWaiters = [];
    w.billingSupportId = supportId;
    w.billingSupportFailures = { supportInfo: options.failSupportInfo ?? false };
    w.__TAURI_INTERNALS__ = { invoke: async (command: string, args: any) => {
      if (command !== "plugin:barbu-purchases|request") return;
      w.billingCalls.push(args.operation);
      const customer = () => ({ verification: "verified", entitlement: "premium", active: w.billingActive,
        checkedAt: Date.now(), expiresAt: w.billingActive ? w.billingExpiresAt : null, willRenew: w.billingActive && w.billingWillRenew });
      if (args.operation === "availability") return { available: true, purchasesEnabled: true };
      if (w.billingSupportFailures[args.operation]) throw new Error("private provider diagnostics");
      if (["supportInfo", "copySupportId", "support"].includes(args.operation)) {
        if (args.operation === "copySupportId") w.copiedBillingReference = w.billingSupportId;
        if (args.operation === "support") w.supportDraftOpened = true;
        return { supportId: w.billingSupportId };
      }
      if (args.operation === "customer" && w.billingCustomerFails) throw new Error("offline");
      if (args.operation === "customer" && w.billingCustomerDeferred) {
        return new Promise(resolve => w.billingCustomerWaiters.push(() => resolve({ customer: customer() })));
      }
      if (args.operation === "offers" && w.billingOffersFail) throw new Error("private store failure");
      if (args.operation === "offers") return { offers: [
        { id: "monthly", price: "EUR 2.49", period: "month" }, { id: "annual", price: "EUR 19.99", period: "year" }
      ] };
      if (args.operation === "purchase") {
        w.billingPurchasedIds.push(args.packageId);
        if (outcome === "purchased") w.billingActive = true;
        return { outcome, ...(outcome === "purchased" ? { customer: customer() } : {}) };
      }
      if (args.operation === "restore") w.billingActive = true;
      return { customer: customer() };
    } };
  }, { outcome, options, supportId });
}

async function openPurchaseHelp(page: Page) {
  const help = page.locator("details.premium-help");
  if (!await help.evaluate(element => (element as HTMLDetailsElement).open)) await help.locator("summary").click();
}

test("Premium offers one checkout with explicit monthly and yearly choices, leaving diagnostics closed", async ({ page }, info) => {
  await mockBilling(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  const monthly = page.getByRole("radio", { name: "Monthly EUR 2.49 / month", exact: true });
  const yearly = page.getByRole("radio", { name: "Yearly EUR 19.99 / year", exact: true });
  await expect(monthly).toBeChecked();
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Billing reference", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Check access", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Restore purchases", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh prices", exact: true })).toHaveCount(0);
  for (const width of [320, 360, 820]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(page.getByRole("button", { name: "Subscribe for EUR 2.49 / month", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByText(/Renews automatically every month until cancelled/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`simplified-paywall-${width}.png`), fullPage: true });
    await yearly.check();
    await expect(page.getByRole("button", { name: "Subscribe for EUR 19.99 / year", exact: true })).toBeVisible();
    await expect(page.getByText(/Renews automatically every year until cancelled/)).toBeVisible();
    await monthly.check();
  }
  expect(await page.evaluate(() => (window as any).billingPurchasedIds)).toEqual([]);
  await yearly.check();
  await page.getByRole("button", { name: "Subscribe for EUR 19.99 / year", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Premium is active", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).billingPurchasedIds)).toEqual(["annual"]);
});

test("active Premium keeps management and contact visible without recovery tools or selling plans", async ({ page }, info) => {
  await mockBilling(page, "purchased", { active: true });
  await page.goto("/");
  await page.locator(".catalog-footer").getByRole("button", { name: "Manage Premium", exact: true }).click();
  for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(size);
    await expect(page.getByRole("button", { name: "Manage or cancel subscription", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Contact support", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Billing reference", exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Check access", exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Restore purchases", exact: true })).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`simplified-active-${size.width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Manage or cancel subscription", exact: true }).click();
  expect(await page.evaluate(() => (window as any).billingCalls.filter((op: string) => op === "manage"))).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).billingPurchasedIds)).toEqual([]);
});

test("contact support opens directly without asking the player to load a reference", async ({ page }) => {
  await mockBilling(page, "purchased", { failSupportInfo: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  await page.getByRole("button", { name: "Contact support", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email app opened");
  expect(await page.evaluate(() => (window as any).supportDraftOpened)).toBe(true);
  await expect(page.getByRole("textbox", { name: "Billing reference", exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => (window as any).billingPurchasedIds)).toEqual([]);
});

test("unavailable prices offer a contextual retry and restore remains keyboard accessible", async ({ page }) => {
  await mockBilling(page, "purchased", { failOffers: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh prices", exact: true })).toBeEnabled();
  await page.evaluate(() => { (window as any).billingOffersFail = false; });
  await page.getByRole("button", { name: "Refresh prices", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(1);
  const summary = page.locator("details.premium-help > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Restore purchases", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore purchases", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Premium is active", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).billingPurchasedIds)).toEqual([]);
});

test("renewal verification hides checkout, resumes the saved hand and loads offers only after confirmed expiry", async ({ page }, info) => {
  test.setTimeout(60_000);
  await mockBilling(page, "purchased", { active: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Play Canasta", exact: true }).click();
  const draw = page.getByRole("region", { name: "Canasta decisions", exact: true })
    .getByRole("button", { name: "Draw stock", exact: true });
  await expect(draw).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"));
  expect(saved).not.toBeNull();

  for (const renewed of [true, false]) {
    const checks = await page.evaluate(() => (window as any).billingCalls.filter((op: string) => op === "customer").length);
    await page.evaluate(() => {
      (window as any).billingExpiresAt = Date.now() + 2_000;
      window.dispatchEvent(new Event("focus"));
    });
    await expect.poll(() => page.evaluate(() => (window as any).billingCalls.filter((op: string) => op === "customer").length))
      .toBe(checks + 1);
    await page.evaluate(() => { (window as any).billingCustomerDeferred = true; });
    await expect(page.getByRole("heading", { name: "Checking Premium access", exact: true })).toBeVisible({ timeout: 7_000 });
    await expect.poll(() => page.evaluate(() => (window as any).billingCustomerWaiters.length)).toBe(1);
    await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"))).toBe(saved);
    if (renewed) await page.screenshot({ path: info.outputPath("renewal-checking.png"), fullPage: true });

    await page.evaluate(renewed => {
      const w = window as any;
      w.billingActive = renewed;
      w.billingWillRenew = renewed;
      w.billingExpiresAt = Date.now() + 300_000;
      w.billingCustomerDeferred = false;
      w.billingCustomerWaiters.splice(0).forEach((finish: () => void) => finish());
    }, renewed);
    if (renewed) {
      await expect(draw).toBeVisible();
      await page.screenshot({ path: info.outputPath("renewal-recovered.png") });
    } else {
      await expect(page.getByRole("button", { name: "Subscribe for EUR 2.49 / month", exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath("expiry-confirmed.png"), fullPage: true });
    }
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedCanastaRun.v1"))).toBe(saved);
  }
  expect(await page.evaluate(() => (window as any).billingCalls.includes("purchase"))).toBe(false);
});

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
    await openPurchaseHelp(page);
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

test("unverified access hides checkout and recovers without asking an existing subscriber to buy again", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockBilling(page, "purchased", { failCustomer: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reconnect to check Premium" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
  await expect(page.getByText("This does not mean your subscription has ended.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage or cancel subscription", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh prices", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Check access", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Reconnect and check access");
  await page.screenshot({ path: testInfo.outputPath("premium-reconnect.png"), fullPage: true });
  await page.evaluate(() => { (window as any).billingCustomerFails = false; (window as any).billingActive = true; });
  await page.getByRole("button", { name: "Check access", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Premium is active" })).toBeVisible();
  expect(await page.evaluate(() => (window as any).billingCalls.includes("purchase"))).toBe(false);
});

test("cancelled subscribers see their access date and a failed refresh does not remove verified access", async ({ page }, testInfo) => {
  await mockBilling(page, "purchased", { active: true, willRenew: false });
  await page.goto("/");
  await page.locator(".catalog-footer").getByRole("button", { name: "Manage Premium", exact: true }).click();
  const date = await page.evaluate(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
    .format((window as any).billingExpiresAt));
  await expect(page.getByText(`Access until: ${date}.`, { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).billingCustomerFails = true; });
  await openPurchaseHelp(page);
  await page.getByRole("button", { name: "Check access", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Premium is active" })).toBeVisible();
  await expect(page.getByText("Access is based on your last verified purchase.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Subscribe for/ })).toHaveCount(0);
  for (const width of [320, 360, 820]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`premium-cancelled-${width}.png`), fullPage: true });
  }

  await page.addInitScript(() => { (window as any).billingCustomerFails = true; });
  await page.reload();
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reconnect to check Premium" })).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Learn", exact: true })).toBeVisible();
});

test("purchase support works with unverified access and fits small screens", async ({ page }, testInfo) => {
  await mockBilling(page, "purchased", { failCustomer: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  const support = page.getByRole("region", { name: "Purchase support", exact: true });
  await openPurchaseHelp(page);
  const reference = support.getByRole("textbox", { name: "Billing reference", exact: true });
  await expect(reference).toHaveValue(supportId);
  await expect(reference).toHaveAttribute("readonly", "");
  for (const width of [320, 360, 820]) {
    await page.setViewportSize({ width, height: 740 });
    await support.scrollIntoViewIfNeeded();
    const bounds = (await support.boundingBox())!;
    const copy = (await support.getByRole("button", { name: "Copy billing reference", exact: true }).boundingBox())!;
    expect(copy.x + copy.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    expect(copy.width).toBe(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`premium-support-${width}.png`), fullPage: true });
  }
  await support.getByRole("button", { name: "Copy billing reference", exact: true }).click();
  await expect(support.getByRole("status")).toHaveText("Billing reference copied.");
  expect(await page.evaluate(() => (window as any).copiedBillingReference)).toBe(supportId);
  await expect(page.getByRole("heading", { name: "Reconnect to check Premium" })).toBeVisible();
  await support.getByRole("button", { name: "Contact support", exact: true }).click();
  await expect(support.getByRole("status")).toContainText("Email app opened");
  expect(await page.evaluate(() => (window as any).supportDraftOpened)).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(supportId);
  expect(await page.evaluate(() => (window as any).billingCalls.includes("purchase"))).toBe(false);
});

test("support clipboard and email failures retain the reference and verified access", async ({ page }) => {
  await mockBilling(page, "purchased", { active: true });
  await page.goto("/");
  await page.locator(".catalog-footer").getByRole("button", { name: "Manage Premium", exact: true }).click();
  const support = page.getByRole("region", { name: "Purchase support", exact: true });
  await openPurchaseHelp(page);
  await page.evaluate(() => { (window as any).billingSupportFailures = { copySupportId: true, support: true }; });
  await support.getByRole("button", { name: "Copy billing reference", exact: true }).click();
  await expect(support.getByRole("alert")).toContainText("Select and copy");
  const reference = support.getByRole("textbox", { name: "Billing reference", exact: true });
  await reference.focus();
  expect(await reference.evaluate(element => (element as HTMLInputElement).selectionStart)).toBe(0);
  expect(await reference.evaluate(element => (element as HTMLInputElement).selectionEnd)).toBe(supportId.length);
  await support.getByRole("button", { name: "Contact support", exact: true }).click();
  await expect(support.getByRole("alert")).toContainText("Email martin@insilicoveritas.org");
  await expect(support).not.toContainText("private provider diagnostics");
  await expect(page.getByRole("heading", { name: "Premium is active" })).toBeVisible();
  await page.evaluate(() => { (window as any).billingSupportFailures = {}; });
  await support.getByRole("button", { name: "Copy billing reference", exact: true }).click();
  await expect(support.getByRole("alert")).toHaveCount(0);
  await expect(support.getByRole("status")).toHaveText("Billing reference copied.");
});

test("missing or malformed references can be retried without exposing raw identifiers", async ({ page }) => {
  await mockBilling(page, "purchased", { failSupportInfo: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Canasta", exact: true }).click();
  const support = page.getByRole("region", { name: "Purchase support", exact: true });
  await expect(support.getByRole("button", { name: "Contact support", exact: true })).toBeEnabled();
  await openPurchaseHelp(page);
  await page.evaluate(() => { (window as any).billingSupportFailures = {}; (window as any).billingSupportId = "private@example.org"; });
  await support.getByRole("button", { name: "Load billing reference", exact: true }).click();
  await expect(support.getByRole("alert")).toContainText("Billing reference is unavailable");
  await expect(support).not.toContainText("private@example.org");
  await page.evaluate(id => { (window as any).billingSupportId = id; }, supportId);
  await support.getByRole("button", { name: "Load billing reference", exact: true }).click();
  await expect(support.getByRole("textbox", { name: "Billing reference", exact: true })).toHaveValue(supportId);
  await expect(support.getByRole("button", { name: "Contact support", exact: true })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Premium is active" })).toHaveCount(0);
});
