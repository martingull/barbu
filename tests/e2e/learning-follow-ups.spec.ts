import { expect, test, type Page } from "@playwright/test";
import { heartsPracticeSteps } from "../../src/lessons/hearts/exercises";
import { drillDecision } from "../../src/lessons/drillDecision";
import { ginLearningSteps, ginExerciseChoices, ginExerciseAnswer, ginSelectsDiscard } from "../../src/lessons/gin-rummy/exercises";
import { formatCardText } from "../../src/presentation/cardDisplay";
import { ginSaveKey } from "../../src/persistence/ginRummySave";
import { learningEvidenceKey } from "../../src/persistence/learningEvidence";

async function open(page: Page, game: string, topic: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator(`[data-skill="${topic}"] .exercise-shortcut`).click();
}

test("Hearts mistakes get fresh bounded examples, stable tables and complete review evidence", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page, "Hearts", "hearts-avoid");
  const originals = heartsPracticeSteps(0, "avoid-hearts");
  const seen = new Set<string>();
  for (let index = 0; index < 3; index++) {
    const prompt = await page.locator(".result").textContent();
    const original = originals.find(step => prompt?.includes(formatCardText(step.trick.beforeResult)))!;
    expect(original).toBeDefined();
    expect(seen.has(original.scenarioId!)).toBe(false);
    seen.add(original.scenarioId!);
    for (const [attempt, step] of [original, original.followUp!].entries()) {
      await expect(page.locator(".result")).toContainText(formatCardText(step.trick.beforeResult));
      const board = page.getByLabel("Drill card table", { exact: true });
      const before = (await board.boundingBox())!;
      const choice = step.trick.hand.find(card => !drillDecision(step, card).result.clean)!;
      await page.getByLabel("Your drill hand").getByRole("button", { name: `${choice.rank} ${choice.suit}`, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect(page.locator(".explanation")).toContainText(formatCardText(drillDecision(step, choice).feedback));
      const after = (await board.boundingBox())!;
      expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1);
      const next = page.getByRole("button", { name: attempt === 0 ? "Try another example" : index === 2 ? "Finish topic" : "Next decision", exact: true });
      await expect(next).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (index === 0) await page.screenshot({ path: info.outputPath(`hearts-attempt-${attempt}.png`), fullPage: true });
      if (attempt === 0) await expect(page.getByRole("button", { name: "Finish topic", exact: true })).toHaveCount(0);
      await next.click();
      if (attempt === 0) expect(Math.abs((await board.boundingBox())!.height - before.height)).toBeLessThanOrEqual(1);
    }
  }
  await expect(page.getByRole("status")).toHaveText("Topic complete.");
  await expect(page.getByLabel("Learning summary")).toContainText("0 of 6 decisions");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).skills["hearts-avoid"], learningEvidenceKey))
    .toMatchObject({ attempts: 1, total: 6, correct: 0 });
  await page.getByText("Review decisions", { exact: true }).click();
  await expect(page.locator(".decision-review")).toHaveCount(6);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3");
});

for (const action of ["melds", "deadwood", "draw", "knock", "gin"]) {
  test(`Gin ${action} reinforces once per miss and includes all six decisions in review`, async ({ page }, info) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page, "Gin Rummy", `gin-${action}`);
    const steps = ginLearningSteps(action).flatMap(step => [step, step.followUp!]);
    for (const [index, step] of steps.entries()) {
      const choice = ginExerciseChoices(action, step).find(choice => !ginExerciseAnswer(action, step, choice.id).good)!;
      if (ginSelectsDiscard(action)) {
        const card = step.hand.find(card => card.id === choice.id)!;
        await page.getByLabel("Your Gin Rummy exercise hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
      } else await page.getByRole("button", { name: choice.label, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      const answer = ginExerciseAnswer(action, step, choice.id);
      await expect(page.locator(".outcome")).toHaveText(answer.illegal ? "Illegal" : "Risky");
      await expect(page.locator(".explanation")).toContainText(formatCardText(answer.text));
      const next = page.getByRole("button", { name: index % 2 === 0 ? "Try another example" : index === 5 ? "Finish topic" : "Next decision", exact: true });
      await next.scrollIntoViewIfNeeded();
      await expect(next).toBeInViewport();
      const boxes = await page.locator(".table-play-panel > *").evaluateAll(elements => elements.map(el => el.getBoundingClientRect())
        .filter(box => box.height > 0).map(box => ({ top: box.top, bottom: box.bottom })));
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (index === 1) await page.screenshot({ path: info.outputPath(`gin-${action}-follow-up.png`), fullPage: true });
      await next.click();
    }
    await expect(page.getByRole("status")).toHaveText("Topic complete.");
    await expect(page.getByLabel("Learning summary")).toContainText("0 of 6 decisions");
    await page.getByText("Review decisions", { exact: true }).click();
    await expect(page.locator(".decision-review")).toHaveCount(6);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator(".contract-status")).toContainText("Decision 1 of 3");
    expect(await page.evaluate(key => localStorage.getItem(key), ginSaveKey)).toBeNull();
  });
}

test("leaving a Gin follow-up does not complete the topic or store attempt evidence", async ({ page }) => {
  await open(page, "Gin Rummy", "gin-knock");
  await page.getByRole("button", { name: "Go gin", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.locator(".contract-status")).toContainText("Decision 2 of 4");
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("0 / 5 complete");
  expect(await page.evaluate(key => localStorage.getItem(key), learningEvidenceKey)).toBeNull();
  await page.locator('[data-skill="gin-knock"] .exercise-shortcut').click();
  await expect(page.locator(".contract-status")).toContainText("Decision 1 of 3");
});
