import { expect, test } from "@playwright/test";
import { createLearningSession, checkLearningAnswer } from "../../src/domain/learningSession";
import { createGinSession } from "../../src/domain/ginRummySession";
import { ginSaveKey, saveGinSession } from "../../src/persistence/ginRummySave";
import { learningEvidenceKey } from "../../src/persistence/learningEvidence";
import { ginTopics } from "../../src/games/ginRummy";
import { formatCardLabel } from "../../src/presentation/cardDisplay";
import { ginLearningSteps, ginExerciseChoices, ginExerciseAnswer, advanceGinLearningSession, type GinExerciseStep } from "../../src/lessons/gin-rummy/exercises";

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  for (const source of ["upcard", "stock"] as const) {
    test(`Gin links ${source}, discard and count at ${size.width}x${size.height}`, async ({ page }, info) => {
      await page.setViewportSize(size);
      const saved = JSON.stringify(saveGinSession(createGinSession(9), "2026-11-23"));
      await page.addInitScript(({ key, saved, progress }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
        if (!localStorage.getItem("barbu.courseProgress.v1")) localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress));
      }, { key: ginSaveKey, saved, progress: Object.fromEntries(ginTopics.filter(topic => topic.action !== "turn").map(topic => [topic.id, true])) });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(page.getByLabel("Gin Rummy course progress")).toContainText("6 / 7 complete");
      await page.getByRole("button", { name: "Continue lesson", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Complete a turn", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "See example", exact: true }).click();
      await page.getByRole("button", { name: "Try cards", exact: true }).click();
      const hand = page.getByLabel("Your Gin Rummy exercise hand", { exact: true });
      const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
      const actions = page.locator(".action-row");
      const baseline = (await hand.boundingBox())!;
      let state = createLearningSession<GinExerciseStep, { clean: boolean }, string>(ginLearningSteps("turn"));
      while (state.phase !== "complete") {
        const step = state.steps[state.index], turn = step.turn!;
        await expect(hand.locator("img")).toHaveCount(step.hand.length);
        if (turn.question === "draw") {
          await expect(page.getByRole("img", { name: formatCardLabel(turn.session.hand.stock[0]), exact: true })).toHaveCount(0);
        }
        const choice = turn.question === "draw" ? ginExerciseChoices("turn", step).find(choice => choice.id === source)!
          : ginExerciseChoices("turn", step).find(choice => ginExerciseAnswer("turn", step, choice.id).good)!;
        if (turn.question === "discard") {
          if (turn.session.hand.blockedDiscard) {
            const blocked = step.hand.find(card => card.id === turn.session.hand.blockedDiscard)!;
            await hand.getByRole("button", { name: `${blocked.rank} ${blocked.suit}`, exact: true }).click();
            await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
          }
          const card = step.hand.find(card => card.id === choice.id)!;
          await hand.getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
        } else await page.getByRole("button", { name: choice.label, exact: true }).click();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        const result = ginExerciseAnswer("turn", step, choice.id);
        await expect(guidance.locator(".outcome")).toHaveText(result.good ? "Good" : "Risky");
        await expect(hand.getByRole("button")).toHaveCount(0);
        const cards = (await hand.boundingBox())!, buttons = (await actions.boundingBox())!, feedback = (await guidance.boundingBox())!;
        expect(cards.y).toBeCloseTo(baseline.y, 0);
        expect(cards.height).toBeCloseTo(baseline.height, 0);
        expect(cards.y).toBeGreaterThanOrEqual(feedback.y + feedback.height);
        expect(buttons.y).toBeGreaterThanOrEqual(cards.y + cards.height);
        expect(buttons.y + buttons.height).toBeLessThanOrEqual(size.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        await page.screenshot({ path: info.outputPath(`gin-turn-${source}-${state.index}-${turn.question}.png`), scale: "css" });
        const nextLabel = step.followUp && !result.good ? "Try another example" : state.index === state.steps.length - 1 ? "Finish topic" : "Next decision";
        state = advanceGinLearningSession(checkLearningAnswer(state, { clean: result.good }, result.text), choice.id);
        await page.getByRole("button", { name: nextLabel, exact: true }).click();
      }
      await expect(page.getByRole("status")).toHaveText("Gin Rummy learning path complete.");
      await expect(page.getByLabel("Learning summary")).toContainText(source === "upcard" ? "3 of 3 decisions" : "2 of 4 decisions");
      await page.getByText("Review decisions", { exact: true }).click();
      await expect(page.locator(".decision-review")).toHaveCount(state.results.length);
      const evidence = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), learningEvidenceKey);
      expect(evidence.skills["gin-turn"]).toMatchObject({ attempts: 1, total: state.results.length });
      expect(await page.evaluate(key => localStorage.getItem(key), ginSaveKey)).toBe(saved);
      await page.reload();
      await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(page.getByLabel("Gin Rummy course progress")).toContainText("7 / 7 complete");
      expect(errors).toEqual([]);
    });
  }
}

test("leaving the linked Gin turn early does not complete it or record attempt evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator('[data-skill="gin-turn"] .exercise-shortcut').click();
  await page.getByRole("button", { name: "Take upcard", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Next decision", exact: true }).click();
  await expect(page.getByLabel("Your Gin Rummy exercise hand").getByRole("button")).toHaveCount(11);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("0 / 7 complete");
  expect(await page.evaluate(key => localStorage.getItem(key), learningEvidenceKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), ginSaveKey)).toBeNull();
  await page.locator('[data-skill="gin-turn"] .exercise-shortcut').click();
  await expect(page.getByLabel("Your Gin Rummy exercise hand").locator("img")).toHaveCount(10);
  await expect(page.locator(".contract-status")).toContainText("Decision 1 of 3");
});
