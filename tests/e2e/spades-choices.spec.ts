import { expect, test } from "@playwright/test";
import { spadesChoiceSteps, type SpadesChoiceStep } from "../../src/lessons/spades/choices";
import { createSpadesSession } from "../../src/domain/spadesSession";
import { saveSpadesSession, spadesSaveKey } from "../../src/persistence/spadesSave";

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  for (const topic of ["object", "bid", "score"] as const) {
    test(`Spades ${topic} has distinct questions, stable feedback and bounded reinforcement at ${size.width}x${size.height}`, async ({ page }, info) => {
      await page.setViewportSize(size);
      const saved = JSON.stringify(saveSpadesSession(createSpadesSession(8), "now"));
      const skill = topic === "object" ? "spades-object" : topic === "bid" ? "spades-books" : "spades-scoring";
      const progress = { "hearts-follow": true, ...(topic === "score" ? { "spades-object": true, "spades-follow-suit": true, "spades-trump": true, "spades-books": true, "spades-bags": true } : {}) };
      await page.addInitScript(({ key, saved, progress }) => {
        localStorage.setItem(key, saved);
        if (!localStorage.getItem("barbu.courseProgress.v1")) localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress));
      }, { key: spadesSaveKey, saved, progress });
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      await page.getByRole("button", { name: "Open Spades", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await page.locator(`[data-skill="${skill}"] .exercise-shortcut`).click();
      const steps = spadesChoiceSteps(topic);
      const feedback = page.getByRole("region", { name: "Turn guidance", exact: true });
      const options = page.getByRole("group", { name: "Spades answer choices", exact: true });
      const actions = page.locator(".action-row");
      async function fits() {
        const region = (await feedback.boundingBox())!, choices = (await options.boundingBox())!, buttons = (await actions.boundingBox())!;
        expect(choices.y).toBeGreaterThanOrEqual(region.y + region.height);
        expect(buttons.y).toBeGreaterThanOrEqual(choices.y + choices.height);
        expect(buttons.y + buttons.height).toBeLessThanOrEqual(size.height);
        if (topic === "bid") {
          const hand = (await page.getByLabel("Your Spades bidding exercise hand", { exact: true }).boundingBox())!;
          expect(hand.y).toBeGreaterThanOrEqual(region.y + region.height);
          expect(choices.y).toBeGreaterThanOrEqual(hand.y + hand.height);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        return [region, choices, buttons].map(box => [box.y, box.height]);
      }
      async function answer(step: SpadesChoiceStep, correct: boolean, label: string) {
        if (topic === "object") await expect(page.getByLabel("Completed Spades trick", { exact: true }).locator(".card-face")).toHaveCount(4);
        if (topic === "bid") await expect(page.getByLabel("Your Spades bidding exercise hand", { exact: true }).locator(".card-face")).toHaveCount(13);
        if (topic === "score") await expect(page.getByLabel("Spades scoring position", { exact: true })).toContainText("Bags carried in");
        const choice = step.options.find(option => (option.id === step.correct) === correct)!;
        await options.getByRole("button", { name: choice.label, exact: true }).click();
        const before = await fits();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        expect(await fits()).toEqual(before);
        await expect(options.getByRole("button", { name: choice.label, exact: true })).toHaveAttribute("aria-pressed", "true");
        for (const button of await options.getByRole("button").all()) await expect(button).toBeDisabled();
        await expect(feedback.getByText(correct ? "Good" : "Risky", { exact: true })).toBeVisible();
        await expect(page.getByLabel(step.breakdown.label, { exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath(`spades-${topic}-${label}.png`), scale: "css" });
      }
      await answer(steps[0], false, "wrong");
      await page.getByRole("button", { name: "Try another example", exact: true }).click();
      await answer(steps[0].followUp!, true, "reinforcement");
      await page.getByRole("button", { name: "Next decision", exact: true }).click();
      for (let index = 1; index < 3; index++) {
        await answer(steps[index], true, String(index));
        await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
      }
      await expect(page.getByRole("status")).toHaveText(topic === "score" ? "Spades learning path complete." : "Topic complete.");
      await expect(page.getByLabel("Learning summary")).toContainText("3 of 4 decisions");
      await page.getByText("Review decisions", { exact: true }).click();
      await expect(page.locator(".decision-review")).toHaveCount(4);
      await page.locator(".decision-review > summary").first().click();
      const review = page.getByRole("region", { name: "Decision 1 review", exact: true });
      if (topic === "bid") await expect(review.getByRole("group", { name: "Your bidding hand", exact: true }).locator(".card-face")).toHaveCount(13);
      if (topic === "score") await expect(review).toContainText("Bags carried in");
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!));
      expect(stored).toMatchObject({ ...progress, [skill]: true });
      const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
      expect(evidence.skills[skill]).toMatchObject({ correct: 3, total: 4, attempts: 1 });
      expect(await page.evaluate(key => localStorage.getItem(key), spadesSaveKey)).toBe(saved);
      expect(errors).toEqual([]);
    });
  }
}
