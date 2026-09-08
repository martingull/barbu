import { test, expect } from "@playwright/test";

test("Hearts passing keeps selected cards bright and fades the rest without moving them", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  const hand = page.getByLabel("Your Hearts passing hand");
  const cards = hand.getByRole("button");
  for (const viewport of [{ width: 360, height: 740 }, { width: 320, height: 568 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await expect(cards).toHaveCount(13);
    await expect(cards.first()).toHaveCSS("opacity", "1");
    const before = await cards.first().boundingBox();
    await cards.first().click();
    await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
    await expect(cards.first()).toHaveCSS("opacity", "1");
    await expect(cards.first()).toHaveCSS("box-shadow", "none");
    await expect(cards.nth(1)).toHaveCSS("opacity", "0.55");
    expect(await cards.first().boundingBox()).toEqual(before);
    await cards.nth(1).click();
    await cards.nth(2).click();
    await expect(hand.getByRole("button", { pressed: true })).toHaveCount(3);
    await expect(cards.nth(1)).toHaveCSS("opacity", "1");
    await expect(cards.nth(2)).toHaveCSS("opacity", "1");
    await expect(cards.nth(3)).toHaveCSS("opacity", "0.55");
    await expect(page.getByRole("button", { name: "Pass cards", exact: true })).toBeEnabled();
    await page.screenshot({ path: info.outputPath(`hearts-selected-${viewport.width}.png`), fullPage: true });
    for (let i = 0; i < 3; i++) await cards.nth(i).click();
    await expect(hand.getByRole("button", { pressed: true })).toHaveCount(0);
    await expect(cards.first()).toHaveCSS("opacity", "1");
    await expect(cards.nth(3)).toHaveCSS("opacity", "1");
    await expect(page.getByRole("button", { name: "Pass cards", exact: true })).toBeDisabled();
  }
});

test("Shared single-card selection preserves legality and resets on the next trick", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("barbu.practiceSeed.v1", "1"));
  await page.goto("/");
  await page.getByRole("button", { name: "Open Whist", exact: true }).click();
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  const hand = page.getByLabel("Your Whist hand");
  const first = hand.locator(".hand-card.legal").first();
  await first.click();
  await expect(first).toHaveCSS("opacity", "1");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(hand.locator('.hand-card.legal[aria-pressed="false"]').first()).toHaveCSS("opacity", "0.55");
  await page.screenshot({ path: info.outputPath("whist-card-selected.png"), fullPage: true });
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await expect(hand).not.toHaveClass(/has-selection/);
  await expect(hand.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(hand.locator(".hand-card.legal").first()).toHaveCSS("opacity", "1");
  await hand.locator(".hand-card.legal").first().click();
  for (const illegal of await hand.locator(".hand-card.illegal").all()) {
    await expect(illegal).toHaveCSS("opacity", "0.42");
  }
});
