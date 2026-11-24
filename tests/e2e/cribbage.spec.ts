import { expect, test, type Page } from "@playwright/test";
import { cribbageTopics } from "../../src/games/cribbage";
import { cribbageLearningSteps, cribbageQuestionAnswer, cribbageAnswerLabel } from "../../src/lessons/cribbage/exercises";
import { cribbageSaveKey, restoreCribbageSession } from "../../src/persistence/cribbageSave";
import { cribbageCards, cribbageSuggestion, cribbageComplete } from "../../src/domain/cribbage";
const learn = "/?preview=cribbage&tab=learn&seed=42";
test("the Cribbage points sheet is available in Learn and exercises without losing an answer", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(learn);
  await page.getByRole("button", { name: /^Points sheet/ }).click();
  const sheet = page.getByRole("dialog", { name: "Cribbage points sheet", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("table", { name: "While playing (pegging)", exact: true }).getByRole("row", { name: "Make exactly 15 2", exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Close points sheet", exact: true })).toBeInViewport({ ratio: 1 });
  const box = (await sheet.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeLessThanOrEqual(568);
  expect(await sheet.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("points-sheet-320.png") });
  await sheet.getByRole("button", { name: "Close points sheet", exact: true }).click();
  await page.locator('[data-skill="cribbage-pegging"] .lesson-topic').click();
  await page.getByRole("button", { name: "2 points", exact: true }).click();
  const position = (await page.getByLabel("Cribbage exercise position", { exact: true }).boundingBox())!;
  const open = page.getByRole("button", { name: "Open Cribbage points sheet", exact: true });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("button", { name: "2 points", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await page.getByLabel("Cribbage exercise position", { exact: true }).boundingBox())!.y).toBeCloseTo(position.y, 0);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".coach-feedback")).toContainText("Good");
  await page.goto(learn);
  await page.locator('[data-skill="cribbage-hand"] .lesson-topic').click();
  const first = cribbageLearningSteps("hand")[0];
  await page.getByRole("button", { name: cribbageQuestionAnswer(first.question), exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Cribbage scoring breakdown", exact: true })).toContainText("Runs of 4: 2 × 4 = 8");
});
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const actions = page.locator(".table-play-panel > .action-row");
  if (await actions.count()) await expect(actions.getByRole("button").last()).toBeInViewport({ ratio: 1 });
  const hand = page.locator(".table-play-panel .full-hand-cards");
  if (await hand.count() && await actions.count()) {
    const h = (await hand.boundingBox())!, a = (await actions.boundingBox())!;
    expect(h.y + h.height).toBeLessThanOrEqual(a.y + 1);
    for (const card of await hand.locator(".hand-card").all()) {
      const box = (await card.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(h.y - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(h.y + h.height + 1);
    }
    const guidance = page.locator(".table-play-panel .coach-feedback");
    if (await guidance.count()) {
      const g = (await guidance.boundingBox())!;
      expect(g.y + g.height + 4).toBeLessThanOrEqual(h.y);
    }
  }
}
async function chooseCard(page: Page, id: string) {
  const card = cribbageCards([id])[0];
  await page.getByLabel("Your Cribbage hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
}
test("pegging teaches the addition before asking for points and preserves the visible count after feedback", async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 1366, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(learn);
    await page.locator('[data-skill="cribbage-pegging"] .lesson-topic').click();
    for (const [index, step] of cribbageLearningSteps("pegging").entries()) {
      const arithmetic = page.getByRole("region", { name: "Running count arithmetic", exact: true });
      await expect(arithmetic).toContainText(["10 + 5 = 15", "7 + 7 = 14", "6 + 3 = 9"][index]);
      await expect(arithmetic).toBeInViewport({ ratio: 1 });
      if (index === 0) await expect(page.getByLabel("Turn guidance", { exact: true })).toContainText("Pegging means earning points");
      const cards = (await page.getByLabel("Cribbage exercise position", { exact: true }).boundingBox())!;
      const math = (await arithmetic.boundingBox())!;
      expect(math.y).toBeGreaterThanOrEqual(cards.y + cards.height);
      await fits(page);
      await page.screenshot({ path: info.outputPath(`pegging-lesson-${viewport.width}-${index}.png`) });
      await page.getByLabel("Cribbage answer choices", { exact: true }).getByRole("button", { name: cribbageAnswerLabel(cribbageQuestionAnswer(step.question), step.question), exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".coach-feedback")).toContainText("You earn");
      expect((await arithmetic.boundingBox())!.y).toBeCloseTo(math.y, 0);
      await fits(page);
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    await page.getByText("Review decisions", { exact: true }).click();
    await page.locator(".decision-review summary").first().click();
    await expect(page.getByRole("region", { name: "Running count arithmetic", exact: true })).toContainText("10 + 5 = 15");
  }
});
test("the pegging explanation teaches count versus score before its worked example without overlapping rules", async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.goto(learn);
    await page.getByRole("button", { name: "Read lesson: Peg for combinations", exact: true }).click();
    await expect(page.getByText("The count is not your score", { exact: true })).toBeVisible();
    const coach = (await page.locator(".learning-copy .learning-coach").boundingBox())!;
    const points = (await page.locator(".learning-points").boundingBox())!;
    expect(coach.y + coach.height + 4).toBeLessThanOrEqual(points.y);
    await page.screenshot({ path: info.outputPath(`pegging-introduction-${viewport.width}.png`) });
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await expect(page.getByLabel("Cribbage course content", { exact: true })).toContainText("The running count stays at 15");
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    await expect(page.getByRole("region", { name: "Running count arithmetic", exact: true })).toContainText("10 + 5 = 15");
  }
});
test("Cribbage Learn completes six staged topics and records review on a small phone", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 320, height: 568 });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(learn);
  for (const topic of cribbageTopics) {
    await page.locator(`[data-skill="${topic.id}"] .lesson-topic`).click();
    for (const [index, step] of cribbageLearningSteps(topic.action).entries()) {
      await expect(page.getByLabel("Cribbage exercise", { exact: true })).toBeVisible();
      await fits(page);
      if (topic.action === "hand" && index === 0) await page.screenshot({ path: info.outputPath("learn-320.png") });
      await page.getByLabel("Cribbage answer choices", { exact: true }).getByRole("button", { name: cribbageAnswerLabel(cribbageQuestionAnswer(step.question), step.question), exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".coach-feedback")).toContainText("Good");
      await fits(page);
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    expect(await page.evaluate(id => JSON.parse(localStorage.getItem("barbu.courseProgress.v1") ?? "{}")[id], topic.id)).toBe(true);
    await page.getByText("Review decisions", { exact: true }).click();
    await page.locator(".decision-review summary").first().click();
    await expect(page.getByText("Your choice", { exact: false }).first()).toBeVisible();
    await page.goto(learn);
  }
  await expect(page.getByText("Learning path complete", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("Cribbage discard, pegging, counting and resume fit compact phones and desktop", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 393, height: 852 }, { width: 1366, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/?preview=cribbage&tab=play&seed=42");
    await page.evaluate(() => localStorage.removeItem("barbu.savedCribbageRun.v1"));
    await page.reload();
    await expect(page.getByRole("button", { name: "Lay away two", exact: true })).toBeDisabled();
    await fits(page);
    await page.screenshot({ path: info.outputPath(`discard-${viewport.width}.png`) });
    for (let decision = 0; decision < 12; decision++) {
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), cribbageSaveKey);
      const session = restoreCribbageSession(saved);
      if (session.review) break;
      const suggested = cribbageSuggestion(session);
      if (session.game.phase === "crib") {
        await chooseCard(page, suggested[0]); await chooseCard(page, suggested[1]);
        await page.getByRole("button", { name: "Lay away two", exact: true }).click();
      } else {
        await chooseCard(page, suggested[0]); await page.getByRole("button", { name: "Play card", exact: true }).click();
      }
      await fits(page);
      if (decision === 1) await page.screenshot({ path: info.outputPath(`pegging-${viewport.width}.png`) });
    }
    await expect(page.getByRole("button", { name: "Next count", exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Cribbage scoring breakdown", exact: true })).toContainText("Total");
    const table = (await page.getByRole("table", { name: "Cribbage scoring breakdown", exact: true }).boundingBox())!;
    const region = (await page.getByLabel("Hand scoring details", { exact: true }).boundingBox())!;
    expect(table.x + table.width).toBeLessThanOrEqual(region.x + region.width + 1);
    await page.screenshot({ path: info.outputPath(`counting-${viewport.width}.png`) });
    const before = await page.evaluate(key => localStorage.getItem(key), cribbageSaveKey);
    await page.reload();
    const restored = await page.evaluate(key => localStorage.getItem(key), cribbageSaveKey);
    expect(restoreCribbageSession(JSON.parse(restored!))).toEqual(restoreCribbageSession(JSON.parse(before!)));
    for (let count = 0; count < 2; count++) { await page.getByRole("button", { name: "Next count", exact: true }).click(); await fits(page); }
    await page.getByRole("button", { name: "Next deal", exact: true }).click();
    await expect(page.getByRole("button", { name: "Lay away two", exact: true })).toBeVisible();
    await expect.poll(() => page.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await fits(page);
  }
  expect(errors).toEqual([]);
});
test("guided Cribbage is separate from a match and finishes after one deal", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?preview=cribbage&tab=play&seed=42");
  const saved = await page.evaluate(key => localStorage.getItem(key), cribbageSaveKey);
  await page.locator("header").getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await expect(page.getByLabel("Turn guidance", { exact: true })).toContainText("Suggested discard");
  const board = (await page.locator(".play-board-region").boundingBox())!;
  await fits(page);
  await page.screenshot({ path: info.outputPath("guided-320.png") });
  await page.getByLabel("Your Cribbage hand", { exact: true }).getByRole("button").nth(0).click();
  await page.getByLabel("Your Cribbage hand", { exact: true }).getByRole("button").nth(1).click();
  await page.getByRole("button", { name: "Lay away two", exact: true }).click();
  for (let turn = 0; turn < 8 && await page.getByRole("button", { name: "Play card", exact: true }).count(); turn++) {
    await page.getByLabel("Your Cribbage hand", { exact: true }).locator("button.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
    await fits(page);
    expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
  }
  for (let count = 0; count < 2; count++) await page.getByRole("button", { name: "Next count", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play without guidance", exact: true })).toBeVisible();
  await fits(page);
  await expect(page.getByRole("button", { name: "Back to Learn", exact: true })).toBeInViewport({ ratio: 1 });
  expect((await page.locator(".play-board-region").boundingBox())!.height).toBeCloseTo(board.height, 0);
  expect(await page.evaluate(key => localStorage.getItem(key), cribbageSaveKey)).toBe(saved);
  await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Play", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("an independent Cribbage game ends at 121, emits one event and restores its result", async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    (window as any).cribbageCompleted = [];
    window.addEventListener("barbu:game-completed", event => (window as any).cribbageCompleted.push((event as CustomEvent).detail));
  });
  await page.goto("/?preview=cribbage&tab=play&seed=42");
  let finished = false;
  for (let decision = 0; decision < 250; decision++) {
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), cribbageSaveKey);
    const session = restoreCribbageSession(saved);
    if (cribbageComplete(session)) { finished = true; break; }
    if (session.review) await page.getByRole("button", { name: /^(Next count|Next deal|See result)$/, exact: true }).click();
    else {
      const suggested = cribbageSuggestion(session);
      await chooseCard(page, suggested[0]);
      if (session.game.phase === "crib") await chooseCard(page, suggested[1]);
      await page.getByRole("button", { name: session.game.phase === "crib" ? "Lay away two" : "Play card", exact: true }).click();
    }
  }
  expect(finished).toBe(true);
  await expect(page.getByLabel("Cribbage game complete", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).cribbageCompleted)).toHaveLength(1);
  const result = await page.getByLabel("Cribbage result summary", { exact: true }).textContent();
  await page.reload();
  await expect(page.getByLabel("Cribbage result summary", { exact: true })).toHaveText(result!);
  await expect(page.getByRole("button", { name: "New game", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next deal", exact: true })).toHaveCount(0);
});
