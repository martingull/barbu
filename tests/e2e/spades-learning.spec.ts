import { expect, test, type Page } from "@playwright/test";
import { createSpadesSession } from "../../src/domain/spadesSession";
import { saveSpadesSession } from "../../src/persistence/spadesSave";
import { spadesLearningSteps } from "../../src/lessons/spades/learning";

const saveKey = "barbu.savedSpadesRun.v1";
async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`guided Spades bids and completes without moving the board at ${size.width}x${size.height}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveSpadesSession(createSpadesSession(8), "2026-10-29"));
    await page.addInitScript(({ key, saved }) => {
      localStorage.setItem(key, saved);
      localStorage.setItem("barbu.practiceSeed.v1", "8");
    }, { key: saveKey, saved });
    await learn(page);
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    const hand = page.getByLabel("Your Spades hand", { exact: true });
    const board = page.locator(".play-board-region");
    const panel = page.getByLabel("Spades hand decision", { exact: true });
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    await expect(hand.getByRole("button")).toHaveCount(13);
    const opening = await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
    const baseline = (await board.boundingBox())!;
    async function fits() {
      const box = (await board.boundingBox())!;
      expect(Math.abs(box.height - baseline.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y - baseline.y)).toBeLessThanOrEqual(1);
      const feedback = (await guidance.boundingBox())!;
      expect(feedback.y).toBeGreaterThanOrEqual(box.y + box.height);
      const actions = (await panel.locator(".action-row").boundingBox())!;
      expect(actions.y + actions.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(panel.getByRole("checkbox")).toHaveCount(0);
    }
    await fits();
    await page.screenshot({ path: info.outputPath("spades-guided-deal.png") });
    await page.getByRole("button", { name: "Adjust bid", exact: true }).click();
    await expect(page.getByRole("button", { name: "Decrease You bid", exact: true })).toBeInViewport({ ratio: 1 });
    await fits();
    // Test nil in one full hand and normal bidding in the others.
    if (size.width === 360) {
      while (await page.getByRole("button", { name: "Decrease You bid", exact: true }).isEnabled()) {
        await page.getByRole("button", { name: "Decrease You bid", exact: true }).click();
      }
      await expect(page.getByLabel("Current hand")).toContainText("Nil");
    } else {
      await page.getByRole("button", { name: "Increase You bid", exact: true }).click();
    }
    await page.screenshot({ path: info.outputPath("spades-guided-bid.png") });
    await page.getByRole("button", { name: "Show cards", exact: true }).click();
    expect(await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
    await page.getByRole("button", { name: "Start hand", exact: true }).click();
    await expect(page.getByRole("button", { name: "Adjust bid", exact: true })).toHaveCount(0);
    for (let trick = 0; trick < 13; trick++) {
      await expect(guidance).toContainText("Rule:");
      await expect(guidance).toContainText("Tactic:");
      await fits();
      await hand.locator(".legal").first().click();
      await page.getByRole("button", { name: "Play card", exact: true }).click();
      if (trick < 12) {
        await expect(page.getByLabel("Trick winner explained")).toContainText("highest");
        await expect(guidance).toContainText(/bid tricks|bid \d+ (covered|reached)/);
        await expect(guidance).toContainText(/leads? next/);
        await fits();
        if (trick === 0 || trick === 6) await page.screenshot({ path: info.outputPath(`spades-guided-trick-${trick}.png`) });
        await page.getByRole("button", { name: "Next trick", exact: true }).click();
      }
    }
    await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
    await expect(page.getByLabel("You + Barbu scoring", { exact: true })).toContainText("Hand total");
    if (size.width === 360) await expect(page.getByLabel("You + Barbu scoring", { exact: true })).toContainText("You nil");
    const recap = page.getByRole("region", { name: "Your hand in review", exact: true });
    await recap.locator("summary").first().click();
    await expect(recap.locator("details[open] img")).toHaveCount(4);
    await expect(page.locator(".table-play-panel .action-row button")).toHaveText(["Replay", "Play without guidance"]);
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("spades-guided-result.png"), fullPage: true });
    if (size.width === 320) {
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      expect(await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
      await expect(page.getByRole("button", { name: "Adjust bid", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
    } else if (size.width === 360) {
      await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
      await expect(page.getByRole("button", { name: "Continue Spades", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
    } else await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    await expect(page.getByLabel("Spades course progress")).toContainText("0 / 5 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(saved);
    expect(errors).toEqual([]);
  });
}

test("Spades lessons share stages, bounded follow-ups, and selection-only bidding", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await learn(page);
  await page.getByRole("button", { name: "Try cards: Bid books", exact: true }).click();
  const steps = spadesLearningSteps("bid");
  const table = page.getByLabel("Drill card table", { exact: true });
  const before = await table.innerHTML();
  await expect(page.getByLabel("Drill decision")).toContainText("Worked example");
  await page.getByLabel("Your drill hand").getByRole("button", { name: "7 D", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  expect(await table.innerHTML()).toBe(before);
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Another example");
  const choices = [steps[0].followUp!, steps[1], steps[2]];
  for (let i = 0; i < choices.length; i++) {
    const step = choices[i];
    const card = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
    await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeInViewport({ ratio: 1 });
    if (i === 1) await expect(page.getByLabel("Drill decision")).toContainText("With guidance");
    if (i === 2) await expect(page.getByLabel("Drill decision")).toContainText("Your turn");
    await page.getByLabel("Your drill hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.getByLabel("Spades decision breakdown")).toBeVisible();
    if (i === 1) await page.screenshot({ path: info.outputPath("spades-lesson-feedback.png") });
    await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!));
  expect(progress).toEqual({ "spades-books": true });
  const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
  expect(evidence.skills["spades-books"]).toMatchObject({ total: 4, correct: 3, attempts: 1 });
});
