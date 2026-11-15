import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";

// Film real lesson states; crop empty margins, never rewrite game copy or cards.
export async function captureStoreJourney({ page, baseURL, output, background }) {
  const captures = [];
  async function capture(id, selector, group = id) {
    await expect.poll(() => page.locator("img").evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: overflow`);
    const targets = page.locator(selector);
    assert(await targets.count() > 0, `${id}: missing crop targets`);
    const bounds = await targets.evaluateAll(elements => elements.map(element => {
      const { x, y, right, bottom } = element.getBoundingClientRect();
      return { x, y, right, bottom };
    }));
    const crop = { x: Math.floor(Math.min(...bounds.map(b => b.x)) - 4),
      y: Math.floor(Math.min(...bounds.map(b => b.y)) - 4),
      right: Math.ceil(Math.max(...bounds.map(b => b.right)) + 4),
      bottom: Math.ceil(Math.max(...bounds.map(b => b.bottom)) + 4) };
    assert(crop.x >= 0 && crop.y >= 0 && crop.right <= 390 && crop.bottom <= 850, `${id}: clipped content`);
    const card = page.locator(".full-hand-cards .card-face").first();
    const cardWidth = await card.count() ? (await card.boundingBox()).width : null;
    await page.screenshot({ path: resolve(output, `${id}-source.png`),
      style: `html, body { background: ${background} !important; } .card { transition: none !important; }` });
    captures.push({ id, group, crop, cardWidth, viewport: page.viewportSize(),
      visibleText: await page.locator("body").innerText() });
    console.log(`Captured ${id}`);
  }
  async function openHearts() {
    await page.goto(baseURL);
    await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
  }
  await page.goto(baseURL);
  await page.evaluate(() => localStorage.setItem("barbu.practiceSeed.v1", "12"));
  await openHearts();
  await page.getByRole("button", { name: "Try cards: Pass three", exact: true }).click();
  const hand = page.getByLabel("Your Hearts pass practice hand", { exact: true });
  await expect(hand.locator(".card-face")).toHaveCount(13);
  const passCrop = ".hearts-pass-cards, .table-play-panel .action-row";
  await capture("pass-question", passCrop, "pass");
  for (const [index, card] of ["Q S", "K S", "A S"].entries()) {
    await hand.getByRole("button", { name: card, exact: true }).click();
    await expect(hand.getByRole("button", { pressed: true })).toHaveCount(index + 1);
    await capture(`pass-select-${index + 1}`, passCrop, "pass");
  }
  await page.getByRole("button", { name: "Check pass", exact: true }).click();
  await expect(page.locator(".coach-feedback")).toContainText("Good pass.");
  await capture("pass-answer", `.coach-feedback, ${passCrop}`);

  await openHearts();
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  const passing = page.getByLabel("Your Hearts passing hand");
  for (let index = 0; index < 3; index++) await passing.getByRole("button").nth(index).click();
  await page.getByRole("button", { name: "Pass cards", exact: true }).click();
  await expect(page.getByLabel("Hearts hand decision")).toContainText("Rule:");
  const legal = page.getByLabel("Your Hearts hand").locator(".legal");
  await legal.first().click();
  await capture("hearts-play", ".table-play-panel");
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByLabel("Trick winner explained")).toContainText("the highest card in");
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeInViewport();
  await capture("hearts-trick", ".card-table, .coach-feedback");

  await page.goto(baseURL);
  const collection = page.locator('[data-collection="partners-tricks"]');
  await collection.evaluate(element => element.scrollIntoView({ block: "center" }));
  await expect(page.getByRole("button", { name: "Open Bridge", exact: true })).toBeInViewport();
  await capture("catalog-partners", '[data-collection="partners-tricks"] > .collection-heading, [data-collection="partners-tricks"] > .catalog-games');
  return captures;
}
