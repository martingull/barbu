import { expect, test, type Page } from "@playwright/test";
import { beloteTopics } from "../../src/games/belote";
import { beloteLearningSteps, beloteAnswerChoices } from "../../src/lessons/belote/exercises";
import { beloteRecommendedAnswer } from "../../src/domain/beloteLearning";
import { createBeloteSession } from "../../src/domain/beloteSession";
import { advanceBeloteOpponents } from "../../src/domain/belotePolicy";
import { beloteSaveKey, saveBeloteSession } from "../../src/persistence/beloteSave";
import { suitSymbol } from "../../src/presentation/cardDisplay";

async function open(page: Page) {
  await page.goto("/");
  const entry = page.getByRole("button", { name: "Open Belote", exact: true });
  await expect(entry).not.toContainText("Premium");
  await entry.click();
}
async function choose(page: Page, step: ReturnType<typeof beloteLearningSteps>[number], answer = beloteRecommendedAnswer(step.question)) {
  const q = step.question;
  if (q.kind === "rank" || q.kind === "play") {
    const card = q.hand.find(card => card.id === answer)!;
    await page.getByLabel("Your Belote exercise hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
  } else await page.getByLabel("Belote answer choices", { exact: true }).getByRole("button", { name: beloteAnswerChoices(q).find(c => c.id === answer)!.label, exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const action = page.locator(".table-play-panel > .action-row");
  await expect(action.getByRole("button").last()).toBeInViewport({ ratio: 1 });
  const hand = page.locator(".table-play-panel .full-hand-cards");
  if (await hand.count()) {
    const h = (await hand.boundingBox())!, a = (await action.boundingBox())!;
    expect(h.y + h.height).toBeLessThanOrEqual(a.y + 1);
    const coach = await page.locator(".coach-feedback").boundingBox();
    if (coach) expect(coach.y + coach.height).toBeLessThanOrEqual(h.y + 1);
    const boxes = await hand.locator(".hand-card").evaluateAll(cards => cards.map(c => c.getBoundingClientRect().toJSON()));
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) {
      expect(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1).toBe(true);
    }
  }
  const holders = await page.locator(".card-table .cardholder").evaluateAll(cs => cs.map(c => c.getBoundingClientRect().toJSON()));
  for (const [i, a] of holders.entries()) for (const b of holders.slice(i + 1)) {
    expect(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1).toBe(true);
  }
  expect(await page.locator("img").evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

test("free Belote completes seven common Learn topics and records decision review", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 568 });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const topic of beloteTopics) {
    await open(page);
    await page.locator(`[data-skill="${topic.id}"] .lesson-topic`).click();
    for (const [i, step] of beloteLearningSteps(topic.action).entries()) {
      await expect(page.getByLabel("Belote exercise", { exact: true })).toBeVisible();
      await fits(page);
      const board = await page.locator(".play-board-region").count() ? await page.locator(".play-board-region").boundingBox() : null;
      await choose(page, step);
      await expect(page.locator(".coach-feedback")).toContainText("Good");
      await fits(page);
      if (board) expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
      await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    expect(await page.evaluate(id => JSON.parse(localStorage.getItem("barbu.courseProgress.v1") ?? "{}")[id], topic.id)).toBe(true);
    await page.getByText("Review decisions", { exact: true }).click();
    await page.locator(".decision-review summary").first().click();
    await expect(page.getByText("Your choice", { exact: false }).first()).toBeVisible();
  }
  await open(page);
  await expect(page.getByLabel("Belote progress", { exact: true })).toContainText("7 / 7 complete");
  await expect(page.getByText("Learning path complete", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("wrong decisions add a different bounded example without completing the topic", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  const first = beloteLearningSteps("values")[0];
  await choose(page, first, "0");
  await expect(page.locator(".coach-feedback")).toContainText("Risky");
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.getByLabel("Your Belote exercise hand", { exact: true }).getByRole("img", { name: "9♠", exact: true })).toBeVisible();
  await choose(page, first.followUp!);
  await expect(page.locator(".coach-feedback")).toContainText("Good");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1") ?? "{}")["belote-values"])).not.toBe(true);
});

test("taking lessons keep their upcard, feedback and controls separate on narrow and wide screens", async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 393, height: 805 }, { width: 1366, height: 900 }]) {
    await page.setViewportSize(viewport); await open(page);
    await page.locator('[data-skill="belote-taking"] .lesson-topic').click();
    const facts = page.getByLabel("Belote exercise position", { exact: true });
    const card = (await facts.locator(".upcard img").boundingBox())!, frame = (await facts.locator(".upcard").boundingBox())!, dl = (await facts.locator("dl").boundingBox())!;
    expect(card.x + card.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    expect(card.y + card.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    expect(card.x + card.width + 8).toBeLessThanOrEqual(dl.x);
    await fits(page); await choose(page, beloteLearningSteps("taking")[0]); await fits(page);
    await page.screenshot({ path: info.outputPath(`belote-taking-${viewport.width}.png`) });
  }
});

test("Belote rules and card-value examples use the shared reference and course", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Game rules/ }).click();
  await expect(page.getByRole("heading", { name: "Belote rules", exact: true })).toBeVisible();
  await expect(page.getByText("152", { exact: false }).first()).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Read lesson: Read ranks and points", exact: true }).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await expect(page.locator(".learning-example-hand img")).toHaveCount(8);
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  await expect(page.getByLabel("Belote exercise", { exact: true })).toBeVisible();
});

test("a full deal keeps eight-card geometry, resumes and settles once", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 360, height: 740 });
  // South is first to decide; the same replay-validated save is used on devices.
  const state = advanceBeloteOpponents(createBeloteSession(1, 3));
  const saved = saveBeloteSession(state, "2026-11-25T12:00:00Z");
  await page.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key: beloteSaveKey, saved });
  await page.goto("/"); await page.getByRole("button", { name: "Continue Belote", exact: true }).click();
  await fits(page);
  await page.getByRole("button", { name: `Take ${suitSymbol(state.hand.upcard.suit)}`, exact: true }).click();
  await expect(page.getByLabel("Your Belote hand", { exact: true }).locator(".hand-card")).toHaveCount(8);
  const board = (await page.locator(".play-board-region").boundingBox())!;
  for (let i = 0; i < 8; i++) {
    await fits(page);
    expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
    await page.getByLabel("Your Belote hand", { exact: true }).locator("button.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    if (i < 7) {
      await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
      await fits(page);
      expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
      if (i === 0) await page.screenshot({ path: info.outputPath("belote-trick-review.png") });
      await page.getByRole("button", { name: "Next trick", exact: true }).click();
    }
  }
  await expect(page.getByLabel("Belote score calculation", { exact: true })).toBeVisible();
  const end = await page.evaluate(key => localStorage.getItem(key), beloteSaveKey);
  await page.screenshot({ path: info.outputPath("belote-deal-score.png") });
  await page.reload(); await page.getByRole("button", { name: "Continue Belote", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).scores, beloteSaveKey)).toEqual(JSON.parse(end!).scores);
  await page.getByRole("button", { name: "Next deal", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).handNumber, beloteSaveKey)).toBe(2);
});

test("guided Belote explains every turn and leaves the saved match alone", async ({ page }) => {
  test.setTimeout(60000);
  await open(page);
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  for (let i = 0; i < 25; i++) {
    if (await page.getByText("Guided deal complete", { exact: true }).count()) break;
    await fits(page);
    await expect(page.getByLabel("Turn guidance", { exact: true })).not.toHaveText("");
    if (await page.getByRole("button", { name: "Pass", exact: true }).count()) await page.getByRole("button", { name: /^Take / }).first().click();
    else if (await page.getByRole("button", { name: "Next trick", exact: true }).count()) await page.getByRole("button", { name: "Next trick", exact: true }).click();
    else { await page.getByLabel("Your Belote hand", { exact: true }).locator("button.legal").first().click(); await page.getByRole("button", { name: "Play card", exact: true }).click(); }
  }
  await expect(page.getByText("Guided deal complete", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), beloteSaveKey)).toBeNull();
  await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("eight-card Play fits short phones and wide browsers without overlapping cards", async ({ page }, info) => {
  const saved = saveBeloteSession(createBeloteSession(1, 3), "2026-11-25T12:00:00Z");
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: beloteSaveKey, saved });
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 393, height: 805 }, { width: 1366, height: 900 }]) {
    await page.setViewportSize(viewport); await page.goto("/");
    await page.getByRole("button", { name: "Continue Belote", exact: true }).click();
    await fits(page);
    const board = (await page.locator(".play-board-region").boundingBox())!;
    await page.getByRole("button", { name: /^Take / }).click();
    await fits(page);
    expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
    const hand = await page.getByLabel("Your Belote hand", { exact: true }).locator(".hand-card").evaluateAll(cs => cs.map(c => c.getBoundingClientRect().toJSON()));
    expect(new Set(hand.map(c => Math.round(c.top))).size).toBe(2);
    expect(hand.filter(c => Math.abs(c.top - hand[0].top) < 1)).toHaveLength(4);
    await page.screenshot({ path: info.outputPath(`belote-play-${viewport.width}.png`) });
  }
});
