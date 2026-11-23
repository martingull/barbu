import { expect, test, type Page } from "@playwright/test";
import { createEuchreSession, transitionEuchreSession } from "../../src/domain/euchreSession";
import { advanceEuchreOpponents } from "../../src/domain/euchrePolicy";
import { saveEuchreSession, euchreSaveKey } from "../../src/persistence/euchreSave";

async function openPreview(page: Page) {
  await page.goto("/?preview=euchre&seed=1");
  await expect(page.getByRole("button", { name: "Order up", exact: true })).toBeVisible();
}
async function geometry(page: Page) {
  const cards = page.getByLabel("Your Euchre hand", { exact: true });
  const controls = page.getByLabel("Euchre turn actions", { exact: true });
  await expect(controls.locator("button").last()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const hand = await cards.boundingBox(), actions = await controls.boundingBox();
  expect(hand!.y + hand!.height).toBeLessThanOrEqual(actions!.y + 1);
  for (const card of await cards.locator(".hand-card").all()) {
    const box = await card.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(hand!.y - 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(hand!.y + hand!.height + 1);
  }
  const calling = page.locator(".calling-controls");
  const callBox = await calling.boundingBox();
  expect(callBox!.y + callBox!.height).toBeLessThanOrEqual(hand!.y + 1);
  const board = await page.locator(".play-board-region").boundingBox();
  const prompt = await page.locator(".euchre-prompt, .coach-feedback.reserved").boundingBox();
  expect(board!.y + board!.height).toBeLessThanOrEqual(prompt!.y + 1);
  expect(prompt!.y + prompt!.height).toBeLessThanOrEqual(callBox!.y + 1);
  for (const holder of await page.locator(".cardholder").all()) {
    const frame = (await holder.boundingBox())!, label = (await holder.locator(".cardholder-label").boundingBox())!;
    expect(frame.y).toBeGreaterThanOrEqual(board!.y);
    expect(frame.y + frame.height).toBeLessThanOrEqual(board!.y + board!.height);
    expect(label.y).toBeGreaterThanOrEqual(frame.y);
    expect(label.y + label.height).toBeLessThanOrEqual(frame.y + frame.height);
    for (const text of await holder.locator(".cardholder-label > *").all()) {
      expect(await text.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    if (await holder.locator(".table-card").count()) {
      const card = (await holder.locator(".table-card").boundingBox())!;
      expect(card.y + card.height + 2).toBeLessThanOrEqual(label.y + 1);
    }
  }
  if (await page.locator(".tutor-slot .cardholder").count()) {
    const north = (await page.locator(".tutor-slot .cardholder").boundingBox())!;
    const south = (await page.locator(".you-slot .cardholder").boundingBox())!;
    expect(north.y + north.height + 4).toBeLessThanOrEqual(south.y + 1);
  }
  return board!;
}

test("Euchre preview shows five cards before calling and keeps decisions clear of cards", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openPreview(page);
  await expect(page.getByLabel("Your Euchre hand", { exact: true }).locator(".hand-card")).toHaveCount(5);
  await expect(page.getByRole("radio", { name: "With partner", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Go alone", exact: true })).toBeVisible();
  await geometry(page);
  await page.getByRole("button", { name: "Order up", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeDisabled();
  await geometry(page);
  await expect(page.locator(".cardholder-label")).toContainText(["North", "West", "East", "South"]);
  expect(errors).toEqual([]);
});

test("Euchre plays five tricks with a stable board, scores once and resumes after refresh", async ({ page }) => {
  await openPreview(page);
  await page.getByRole("button", { name: "Order up", exact: true }).click();
  const original = await geometry(page);
  for (let trick = 0; trick < 5; trick++) {
    const cards = page.getByLabel("Your Euchre hand", { exact: true });
    await cards.locator("button.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    if (trick < 4) {
      const board = await geometry(page);
      expect(Math.abs(board.height - original.height)).toBeLessThanOrEqual(1);
      await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
      if (trick === 0) {
        const saved = await page.evaluate(key => localStorage.getItem(key), euchreSaveKey);
        await page.reload();
        await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
        const resumed = await page.evaluate(key => localStorage.getItem(key), euchreSaveKey);
        expect(JSON.parse(resumed!).events).toEqual(JSON.parse(saved!).events);
      }
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }
  await expect(page.getByLabel("Euchre result summary", { exact: true })).toContainText("score");
  const before = await page.getByLabel("Euchre score", { exact: true }).textContent();
  await page.reload();
  await expect(page.getByLabel("Euchre score", { exact: true })).toHaveText(before!);
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  await expect(page.getByLabel("Euchre score", { exact: true })).toContainText("2");
});

test("South can choose another trump after all first-round passes without a pickup", async ({ page }) => {
  let fixture = createEuchreSession(0);
  for (let seed = 0; seed < 300; seed++) {
    let candidate = createEuchreSession(seed, 2);
    for (let i = 0; i < 4; i++) candidate = transitionEuchreSession(candidate, { type: "pass" });
    candidate = advanceEuchreOpponents(candidate);
    if (candidate.hand.phase === "calling" && candidate.hand.turn === 2) { fixture = candidate; break; }
  }
  expect(fixture.hand.round).toBe(2);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: euchreSaveKey, value: JSON.stringify(saveEuchreSession(fixture, "2026-11-23T12:00:00.000Z"))
  });
  await page.goto("/?preview=euchre");
  await expect(page.getByLabel("Your Euchre hand", { exact: true }).locator(".hand-card")).toHaveCount(5);
  const options = page.getByRole("group", { name: "Trump", exact: true }).getByRole("button");
  await expect(options).toHaveCount(3);
  await options.last().click();
  await geometry(page);
  await page.getByLabel("Euchre turn actions").getByRole("button", { name: /^Call/ }).click();
  await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeVisible();
});

test("South's dealer discard is private, selectable and restores five cards", async ({ page }) => {
  const fixture = transitionEuchreSession(createEuchreSession(30, 2), { type: "call", trump: createEuchreSession(30, 2).hand.upcard.suit });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: euchreSaveKey, value: JSON.stringify(saveEuchreSession(fixture, "2026-11-23T12:00:00.000Z"))
  });
  await page.goto("/?preview=euchre");
  const cards = page.getByLabel("Your Euchre hand", { exact: true });
  await expect(cards.getByRole("button")).toHaveCount(6);
  await geometry(page);
  await cards.getByRole("button").first().click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(cards.locator(".hand-card")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeVisible();
  await geometry(page);
});

test("South sitting out a lone hand cannot select cards and can advance all five tricks", async ({ page }) => {
  const initial = createEuchreSession(40, 3);
  const fixture = transitionEuchreSession(initial, { type: "call", trump: initial.hand.upcard.suit, alone: true });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: euchreSaveKey, value: JSON.stringify(saveEuchreSession(fixture, "2026-11-23T12:00:00.000Z"))
  });
  await page.goto("/?preview=euchre");
  await expect(page.getByText("North is playing alone. Your hand sits out.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your Euchre hand", { exact: true }).getByRole("button")).toHaveCount(0);
  for (let trick = 0; trick < 4; trick++) {
    await geometry(page);
    await page.getByRole("button", { name: "Next trick", exact: true }).click();
  }
  await expect(page.getByLabel("Euchre result summary", { exact: true })).toBeVisible();
});

test("the free browser catalog does not expose Premium games without preview access", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open Hearts", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Euchre", exact: true })).toHaveCount(0);
});

test("calling and review fit a small 320 by 568 viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openPreview(page);
  await geometry(page);
  await page.getByRole("button", { name: "Order up", exact: true }).click();
  await page.getByLabel("Your Euchre hand", { exact: true }).locator("button.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeInViewport();
  await geometry(page);
});

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 393, height: 805 }, { width: 1280, height: 800 }]) {
  test(`Euchre seat roles stay below cards throughout a lone hand at ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    await openPreview(page);
    await geometry(page);
    await page.getByRole("radio", { name: "Go alone", exact: true }).check();
    await page.getByRole("button", { name: "Order up", exact: true }).click();
    await expect(page.locator(".you-slot .cardholder-label")).toContainText("Caller, alone");
    const initial = await geometry(page);
    for (let trick = 0; trick < 5; trick++) {
      await page.getByLabel("Your Euchre hand", { exact: true }).locator("button.legal").first().click();
      await page.getByRole("button", { name: "Play card", exact: true }).click();
      if (trick === 4) break;
      await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
      expect((await geometry(page)).height).toBeCloseTo(initial.height, 0);
      await expect.poll(() => page.locator(".card-table img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      if (trick === 0) await page.screenshot({ path: info.outputPath(`euchre-lone-review-${size.width}.png`), scale: "css" });
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
      expect((await geometry(page)).height).toBeCloseTo(initial.height, 0);
    }
    await expect(page.getByLabel("Euchre result summary", { exact: true })).toBeVisible();
  });
}
