import { expect, test, type Page } from "@playwright/test";
import { createWhistSession } from "../../src/domain/whistSession";
import { saveWhistSession, whistSaveKey } from "../../src/persistence/whistSave";
import { whistLearningSteps } from "../../src/lessons/whist/learning";
import { whistCourses } from "../../src/lessons/whist/courses";
import type { WhistPracticeAction } from "../../src/games/whist";

async function learn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Whist", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`guided Whist completes with stable geometry at ${size.width}x${size.height}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const saved = JSON.stringify(saveWhistSession(createWhistSession(8, "rubber"), "2026-10-29"));
    await page.addInitScript(({ key, saved }) => {
      localStorage.setItem(key, saved);
      localStorage.setItem("barbu.practiceSeed.v1", "8");
    }, { key: whistSaveKey, saved });
    await learn(page);
    await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
    const hand = page.getByLabel("Your Whist hand", { exact: true });
    const board = page.locator(".play-board-region");
    const guidance = page.getByRole("region", { name: "Turn guidance", exact: true });
    const opening = await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")));
    expect(opening).toHaveLength(13);
    const baseline = (await board.boundingBox())!;
    async function fits() {
      const box = (await board.boundingBox())!;
      expect(Math.abs(box.height - baseline.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y - baseline.y)).toBeLessThanOrEqual(1);
      expect((await guidance.boundingBox())!.y).toBeGreaterThanOrEqual(box.y + box.height);
      const actions = (await page.getByLabel("Whist hand decision", { exact: true }).locator(".action-row").boundingBox())!;
      expect(actions.y + actions.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: /Show hint|Explain trick/ })).toHaveCount(0);
    }
    await expect(guidance).toContainText("dealer's last card");
    await fits();
    await page.screenshot({ path: info.outputPath("whist-guided-deal.png") });
    for (let trick = 0; trick < 13; trick++) {
      await expect(guidance).toContainText("Rule:");
      await expect(guidance).toContainText("Tactic:");
      await fits();
      await hand.locator(".legal").first().click();
      await page.getByRole("button", { name: "Play card", exact: true }).click();
      if (trick < 12) {
        await expect(page.getByLabel("Trick winner explained")).toContainText("highest");
        await expect(guidance).toContainText(/points? above six/);
        await expect(guidance).toContainText(/leads? next/);
        await fits();
        if (trick === 0 || trick === 6) await page.screenshot({ path: info.outputPath(`whist-guided-trick-${trick}.png`) });
        await page.getByRole("button", { name: "Next trick", exact: true }).click();
      }
    }
    await expect(page.getByRole("heading", { name: "Guided hand complete", exact: true })).toBeVisible();
    await expect(page.getByLabel("Whist hand scoring", { exact: true })).toContainText("Honours");
    const recap = page.getByRole("region", { name: "Your hand in review", exact: true });
    await recap.locator("summary").first().click();
    await expect(recap.locator("details[open] img")).toHaveCount(4);
    await expect(page.locator(".table-play-panel .action-row button")).toHaveText(["Replay", "Play without guidance"]);
    await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("whist-guided-result.png"), fullPage: true });
    if (size.width === 320) {
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      expect(await hand.getByRole("button").evaluateAll(cards => cards.map(card => card.getAttribute("aria-label")))).toEqual(opening);
      await page.getByRole("button", { name: "Table", exact: true }).first().click();
    } else if (size.width === 360) {
      await page.getByRole("button", { name: "Play without guidance", exact: true }).click();
      await expect(page.getByRole("button", { name: "Continue Whist", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
    } else await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
    await expect(page.getByLabel("Whist course progress")).toContainText("0 / 7 complete");
    expect(await page.evaluate(key => localStorage.getItem(key), whistSaveKey)).toBe(saved);
    expect(errors).toEqual([]);
  });
}

test("Whist opening lead shares stages, bounded reinforcement and selection-only feedback", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await learn(page);
  await page.getByRole("button", { name: "Try cards: Opening lead", exact: true }).click();
  const steps = whistLearningSteps("lead");
  const table = page.getByLabel("Drill card table", { exact: true });
  const before = await table.innerHTML();
  await expect(page.getByLabel("Drill decision")).toContainText("Worked example");
  await page.getByLabel("Your drill hand").getByRole("button", { name: "A D", exact: true }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  expect(await table.innerHTML()).toBe(before);
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await expect(page.getByLabel("Drill decision")).toContainText("Another example");
  for (const [i, step] of [steps[0].followUp!, steps[1], steps[2]].entries()) {
    const card = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
    await expect(page.getByRole("button", { name: "Check answer", exact: true })).toBeInViewport({ ratio: 1 });
    if (i === 1) await expect(page.getByLabel("Drill decision")).toContainText("With guidance");
    if (i === 2) await expect(page.getByLabel("Drill decision")).toContainText("Your turn");
    await page.getByLabel("Your drill hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.getByLabel("Whist decision breakdown")).toContainText("Convention");
    if (i === 1) await page.screenshot({ path: info.outputPath("whist-lesson-feedback.png") });
    await page.getByRole("button", { name: i === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toEqual({ "whist-opening-lead": true });
  const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.learningEvidence.v1")!));
  expect(evidence.skills["whist-opening-lead"]).toMatchObject({ total: 4, correct: 3, attempts: 1 });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByLabel("Drill progress")).toContainText("0 / 3");
});

test("all seven Whist courses retain completion keys and finish at the shared guided-play entry", async ({ page }) => {
  test.setTimeout(60_000);
  await learn(page);
  for (const [i, course] of whistCourses.entries()) {
    await page.getByRole("button", { name: new RegExp(`^${i + 1} .*${course.title}`) }).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    const action = course.practiceTarget.kind === "practice" ? course.practiceTarget.action as WhistPracticeAction : "follow";
    for (const [index, step] of whistLearningSteps(action).entries()) {
      const card = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
      await page.getByLabel("Your drill hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
    }
    await expect(page.getByRole("status")).toHaveText(i === 6 ? "Whist learning path complete." : "Topic complete.");
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toEqual(Object.fromEntries(whistCourses.map(course => [course.pathStepId, true])));
  expect(await page.evaluate(key => localStorage.getItem(key), whistSaveKey)).toBeNull();
});
