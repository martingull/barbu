import { expect, test, type Page } from "@playwright/test";
import { guidedLessons } from "../../src/lessons/catalog";
import { barbuDef } from "../../src/games/barbu";
import { barbuLearningSteps } from "../../src/lessons/barbu/learning";
import type { DrillStep } from "../../src/lessons/drillDecision";

async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function startLesson(page: Page, index: number) {
  await page.locator(`[data-skill="${barbuDef.learnSteps[index].id}"] .lesson-topic`).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
}
async function answer(page: Page, step: DrillStep) {
  const card = step.trick.hand.find(card => step.trick.cardOutcomes[card.id] === "good")
    ?? step.trick.hand.find(card => step.trick.legalCardIds.includes(card.id))!;
  await page.getByLabel("Your drill hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 820, height: 1180 }]) {
  test(`all Barbu lessons share stages, reviews and completion at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await learn(page);
    for (const [topic, lesson] of guidedLessons.entries()) {
      await startLesson(page, topic);
      for (const [index, step] of barbuLearningSteps(lesson.id).entries()) {
        await expect(page.locator(".contract-status")).toContainText(`${index + 1} of 3`);
        await expect(page.getByLabel("Drill decision")).toContainText(["Worked example", "With guidance", "Your turn"][index]);
        const board = (await page.locator(".play-board-region").boundingBox())!;
        await answer(page, step);
        await expect(page.getByLabel("Decision explained", { exact: true })).toBeVisible();
        const after = (await page.locator(".play-board-region").boundingBox())!;
        expect(Math.abs(after.height - board.height)).toBeLessThanOrEqual(1);
        const next = page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true });
        await expect(next).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect.poll(() => page.locator("img.card-face").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        if (index === 2) await page.screenshot({ path: info.outputPath(`${lesson.id}-feedback.png`) });
        await next.click();
      }
      await expect(page.getByLabel("Learning summary")).toContainText("3 of 3 decisions matched the lesson's goal");
      await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
      await expect(page.getByLabel("Barbu course progress")).toContainText(`${topic + 1} / 7 complete`);
    }
  });
}

test("Barbu locks mistakes, adds one companion and retains both decisions in review", async ({ page }) => {
  await learn(page);
  await startLesson(page, 5);
  const steps = barbuLearningSteps("barbu-hearts-trumps");
  await page.getByLabel("Your drill hand").getByRole("button", { name: "2 D", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByLabel("Decision explained")).toContainText("5 reward points for Right");
  await page.getByLabel("Your drill hand").getByRole("button", { name: "7 H", exact: true }).click();
  await expect(page.locator(".drill-hand .played")).toHaveAttribute("aria-label", "2 D");
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Another example");
  for (const [index, step] of [steps[0].followUp!, steps[1], steps[2]].entries()) {
    await answer(page, step);
    await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  await expect(page.getByLabel("Learning summary")).toContainText("3 of 4 decisions");
  await page.getByText("Review decisions", { exact: true }).click();
  await expect(page.locator(".decision-review")).toHaveCount(4);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3");
});

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }, { width: 1365, height: 900 }]) {
  for (const contract of ["No Last Two", "Domino"]) {
    test(`guided ${contract} completes and stays stable at ${viewport.width}`, async ({ page }, info) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize(viewport);
      await learn(page);
      await page.getByRole("tab", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Play Barbu", exact: true }).click();
      await page.getByRole("button", { name: "Start hand", exact: true }).click();
      const saved = await page.evaluate(() => localStorage.getItem("barbu.savedPlayRun.v1"));
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
      await page.getByRole("radio", { name: contract, exact: true }).check();
      await expect(page.getByRole("heading", { name: "Choose a contract", exact: true })).toHaveCSS("color", "rgb(247, 250, 243)");
      await expect(page.getByLabel("Guided Barbu setup").locator("label").first()).toHaveCSS("color", "rgb(247, 250, 243)");
      await page.screenshot({ path: info.outputPath("guided-setup.png"), fullPage: true });
      await page.getByRole("button", { name: "Deal guided hand", exact: true }).click();
      const hand = page.getByLabel(`Your ${contract} hand`, { exact: true });
      const opening = await hand.locator("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
      const board = page.locator(".play-board-region");
      const baseline = (await board.boundingBox())!;
      for (let turn = 0; turn < 130; turn++) {
        if (await page.getByRole("heading", { name: "Guided hand complete", exact: true }).isVisible()) break;
        const box = (await board.boundingBox())!;
        expect(Math.abs(box.height - baseline.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.y - baseline.y)).toBeLessThanOrEqual(1);
        const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
        expect((await guidance.boundingBox())!.y).toBeGreaterThanOrEqual(box.y + box.height);
        const actions = (await page.locator(".table-play-panel > .action-row").boundingBox())!;
        expect(actions.y + actions.height).toBeLessThanOrEqual(viewport.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (turn === 0 || turn === 7) await page.screenshot({ path: info.outputPath(`guided-${turn}.png`) });
        const next = page.getByRole("button", { name: "Next trick", exact: true });
        if (await next.isVisible()) { await next.click(); continue; }
        await expect(guidance).toContainText("Rule:");
        if (contract === "Domino" && !await hand.locator(".legal").count()) await page.getByRole("button", { name: "Pass", exact: true }).click();
        else {
          await hand.locator(".legal").first().click();
          await page.getByRole("button", { name: contract === "Domino" ? "Place card" : "Play card", exact: true }).click();
        }
      }
      await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
      if (contract === "Domino") await expect(page.getByLabel("Domino finishing order")).toContainText("+45");
      else {
        const recap = page.getByRole("region", { name: "Your hand in review", exact: true });
        await expect(recap).toContainText("Trick 12");
        await recap.locator("summary").first().click();
        await expect(recap.locator("details[open] img")).toHaveCount(4);
      }
      await page.screenshot({ path: info.outputPath("guided-complete.png"), fullPage: true });
      if (viewport.width === 320) {
        await page.getByRole("button", { name: "Replay", exact: true }).click();
        expect(await hand.locator("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
        await page.getByRole("button", { name: "Table", exact: true }).first().click();
      } else if (viewport.width === 360) {
        await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
        await expect(page.getByRole("button", { name: "Continue Play Barbu", exact: true })).toBeVisible();
        await page.getByRole("tab", { name: "Learn", exact: true }).click();
      } else await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
      await expect(page.getByLabel("Barbu course progress")).toContainText("0 / 7 complete");
      expect(await page.evaluate(() => localStorage.getItem("barbu.savedPlayRun.v1"))).toBe(saved);
      expect(errors).toEqual([]);
    });
  }
}
