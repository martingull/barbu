import { expect, test } from "@playwright/test";
import { spadesLearningSteps } from "../../src/lessons/spades/learning";
import { createSpadesSession } from "../../src/domain/spadesSession";
import { saveSpadesSession, spadesSaveKey } from "../../src/persistence/spadesSave";
import type { DrillStep } from "../../src/lessons/drillDecision";

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  for (const topic of ["lead", "nil"] as const) {
    test(`Spades ${topic} exercises fit, lock answers and preserve progress at ${size.width}x${size.height}`, async ({ page }, info) => {
      await page.setViewportSize(size);
      const saved = JSON.stringify(saveSpadesSession(createSpadesSession(8), "now"));
      const progress = { "spades-object": true, "spades-follow-suit": true, "spades-trump": true,
        "spades-books": true, "spades-bags": true, "spades-scoring": true, "hearts-follow": true };
      await page.addInitScript(({ key, saved, progress }) => {
        localStorage.setItem(key, saved);
        localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress));
      }, { key: spadesSaveKey, saved, progress });
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      await page.getByRole("button", { name: "Open Spades", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(page.getByLabel("Spades course progress")).toContainText("6 / 9 complete");
      const skill = topic === "lead" ? "spades-leading" : "spades-nil";
      await page.locator(`[data-skill="${skill}"] .exercise-shortcut`).click();
      const steps = spadesLearningSteps(topic);
      const hand = page.getByLabel("Your drill hand", { exact: true });
      const board = page.getByLabel("Drill card table", { exact: true });
      const feedback = page.getByRole("region", { name: "Turn guidance", exact: true });
      async function answer(step: DrillStep, clean: boolean, name: string) {
        const choice = step.trick.hand.find(card => (step.trick.cardOutcomes[card.id] === "good") === clean)!;
        const button = hand.getByRole("button", { name: `${choice.rank} ${choice.suit}`, exact: true });
        await button.click();
        if (topic === "lead") {
          for (const card of step.trick.hand) {
            await expect(hand.getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }))
              .toHaveClass(new RegExp(step.trick.legalCardIds.includes(card.id) ? "\\blegal\\b" : "\\billegal\\b"));
          }
        }
        const before = { board: topic === "lead" ? null : await board.boundingBox(), hand: await hand.boundingBox(), feedback: await feedback.boundingBox() };
        if (topic === "lead") {
          const progress = (await page.getByLabel("Drill progress", { exact: true }).boundingBox())!;
          expect(before.feedback!.y).toBeLessThanOrEqual(progress.y + progress.height + 12);
        }
        await page.screenshot({ path: info.outputPath(`spades-${topic}-${name}-question.png`), scale: "css" });
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        expect({ board: topic === "lead" ? null : await board.boundingBox(), hand: await hand.boundingBox(), feedback: await feedback.boundingBox() }).toEqual(before);
        const other = step.trick.hand.find(card => card.id !== choice.id)!;
        await hand.getByRole("button", { name: `${other.rank} ${other.suit}`, exact: true }).click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        if (topic === "lead") await expect(board).toHaveCount(0);
        const actions = (await page.locator(".action-row").boundingBox())!;
        expect(actions.y).toBeGreaterThanOrEqual(before.hand!.y + before.hand!.height);
        expect(actions.y + actions.height).toBeLessThanOrEqual(size.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`spades-${topic}-${name}-feedback.png`), scale: "css" });
      }
      await answer(steps[0], false, "wrong");
      await page.getByRole("button", { name: "Try another example", exact: true }).click();
      await answer(steps[0].followUp!, true, "reinforcement");
      await page.getByRole("button", { name: "Next decision", exact: true }).click();
      for (let index = 1; index < 3; index++) {
        await answer(steps[index], true, String(index));
        await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
      }
      await expect(page.getByRole("status")).toHaveText("Topic complete.");
      await page.getByText("Review decisions", { exact: true }).click();
      await expect(page.locator(".decision-review")).toHaveCount(4);
      await page.locator(".decision-review > summary").first().click();
      const review = page.getByRole("region", { name: "Decision 1 review", exact: true });
      if (topic === "lead") await expect(review.getByText("Table before your choice", { exact: true })).toHaveCount(0);
      expect(await page.evaluate(key => localStorage.getItem(key), spadesSaveKey)).toBe(saved);
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!));
      expect(stored).toMatchObject({ ...progress, [skill]: true });
      const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
      expect(evidence.skills[skill]).toMatchObject({ correct: 3, total: 4, attempts: 1 });
      expect(errors).toEqual([]);
    });
  }
}
