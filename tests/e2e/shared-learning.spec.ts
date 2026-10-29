import { test, expect } from "@playwright/test";
import { heartsPracticeSteps } from "../../src/lessons/hearts/exercises";
import { drillDecision } from "../../src/lessons/drillDecision";
import { ginLearningSteps, ginExerciseChoices, ginExerciseAnswer } from "../../src/lessons/gin-rummy/exercises";

for (const width of [320, 820]) {
  for (const game of ["Hearts", "Gin Rummy"]) {
    test(`${game} uses the shared learning stages and review at ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 1180 });
      await page.goto("/");
      await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      const topic = game === "Hearts" ? "hearts-avoid" : "gin-deadwood";
      await page.locator(`[data-skill="${topic}"] .exercise-shortcut`).click();
      for (const [index, label] of ["Worked example", "With guidance", "Your turn"].entries()) {
        await expect(page.locator(".teaching-stage")).toHaveText(label);
        await expect(page.getByRole("checkbox")).toHaveCount(0);
        if (index === 0) await page.screenshot({ path: info.outputPath("worked-example.png"), fullPage: true });
        if (game === "Hearts") {
          const step = heartsPracticeSteps(0, "avoid-hearts")[index];
          const choice = step.trick.hand.find(card => drillDecision(step, card).result.clean)!;
          await page.getByLabel("Your drill hand").getByRole("button", { name: `${choice.rank} ${choice.suit}`, exact: true }).click();
        } else {
          const step = ginLearningSteps("deadwood")[index];
          const choice = ginExerciseChoices("deadwood", step).find(choice => ginExerciseAnswer("deadwood", step, choice.id).good)!;
          await page.getByRole("button", { name: choice.label, exact: true }).click();
        }
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        const breakdown = page.getByRole("region", { name: game === "Hearts" ? "Hearts decision breakdown" : "Deadwood breakdown", exact: true });
        await expect(breakdown).toBeVisible();
        if (index === 0) await page.screenshot({ path: info.outputPath("decision-feedback.png"), fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
      }
      await expect(page.getByRole("status")).toHaveText("Topic complete.");
      await page.getByText("Review decisions", { exact: true }).click();
      await page.locator(".decision-review summary").first().click();
      const review = page.getByRole("region", { name: "Decision 1 review", exact: true });
      await expect(review.locator(".feedback-breakdown")).toBeVisible();
      await page.getByRole("button", { name: "Try again", exact: true }).click();
      await expect(page.locator(".teaching-stage")).toHaveText("Worked example");
      await expect(page.locator(".contract-status")).toContainText("1 of 3");
    });
  }
}
