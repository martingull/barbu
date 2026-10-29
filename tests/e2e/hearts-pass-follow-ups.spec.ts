import { expect, test, type Page } from "@playwright/test";
import { heartsPassingSteps } from "../../src/lessons/hearts/exercises";
import { evaluateHeartsPass } from "../../src/domain/heartsPractice";
import { createHeartsSession } from "../../src/domain/heartsSession";
import { saveHeartsSession } from "../../src/persistence/heartsSave";
import { learningEvidenceKey } from "../../src/persistence/learningEvidence";

async function openPass(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.locator('[data-skill="hearts-pass"] .exercise-shortcut').click();
}
async function select(page: Page, ids: string[]) {
  for (const id of ids) await page.getByLabel("Your Hearts pass practice hand").getByRole("button", {
    name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true
  }).click();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }]) {
  test(`Pass three reinforces each missed goal once and fits ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const saved = JSON.stringify(saveHeartsSession(createHeartsSession(8), "before-lesson"));
    await page.addInitScript(saved => {
      localStorage.setItem("barbu.practiceSeed.v1", "12");
      localStorage.setItem("barbu.savedHeartsRun.v1", saved);
    }, saved);
    await openPass(page);
    const steps = heartsPassingSteps(12).flatMap(step => [step, step.followUp!]);
    for (const [index, step] of steps.entries()) {
      await expect(page.getByLabel("Hearts pass practice cards")).toContainText(step.prompt);
      const cards = step.playerHand.map(card => card.id);
      const wrong = cards.map((_, i) => cards.slice(i, i + 3))
        .find(ids => ids.length === 3 && evaluateHeartsPass(step, ids).outcomeKind === "risky")!;
      const check = page.getByRole("button", { name: "Check pass", exact: true });
      await expect(check).toBeDisabled();
      await select(page, wrong.slice(0, 2));
      await expect(check).toBeDisabled();
      await select(page, wrong.slice(2));
      await select(page, [cards.find(id => !wrong.includes(id))!]);
      await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Remove one card");
      await expect(page.getByLabel("Your Hearts pass practice hand").getByRole("button", { pressed: true })).toHaveCount(3);
      await check.click();
      const hand = page.getByLabel("Your Hearts pass practice hand");
      await expect(hand.getByRole("button")).toHaveCount(0);
      await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Risky pass. Legal pass.");
      await hand.locator(".hand-card").last().click();
      await expect(hand.locator(".selected")).toHaveCount(3);
      for (const selected of await hand.locator(".selected").all()) await expect(selected).toHaveCSS("opacity", "1");
      await expect(hand.locator(".hand-card:not(.selected)").first()).toHaveCSS("opacity", "0.55");
      await expect.poll(() => hand.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      const next = page.getByRole("button", { name: index % 2 === 0 ? "Try another example" : index === 5 ? "Finish topic" : "Next pass", exact: true });
      await expect(next).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const rows = await hand.locator(".hand-card").evaluateAll(cards => cards.map(card => {
        const box = card.getBoundingClientRect(); return { top: box.top, bottom: box.bottom };
      }));
      expect(rows[6].top).toBe(rows[0].top);
      expect(rows[7].top - rows[0].bottom).toBeGreaterThanOrEqual(4);
      const feedback = (await page.locator(".coach-feedback").boundingBox())!;
      expect(rows[0].top - feedback.y - feedback.height).toBeGreaterThanOrEqual(4);
      if (index < 2) await page.screenshot({ path: info.outputPath(`pass-${index}.png`), fullPage: true });
      if (index === 4) await expect(page.getByRole("button", { name: "Finish topic", exact: true })).toHaveCount(0);
      await next.click();
    }
    await expect(page.getByRole("status")).toHaveText("Topic complete.");
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).skills["hearts-pass"], learningEvidenceKey))
      .toMatchObject({ attempts: 1, total: 6, correct: 0 });
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedHeartsRun.v1"))).toBe(saved);
    await page.getByText("Review decisions", { exact: true }).click();
    await expect(page.locator(".decision-review")).toHaveCount(6);
    for (const index of [0, 1]) {
      await page.locator(".decision-review > summary").nth(index).click();
      const review = page.getByRole("region", { name: `Decision ${index + 1} review`, exact: true });
      await expect(review.locator("img")).toHaveCount(13);
      await expect(review.locator(".chosen")).toHaveCount(3);
      await expect(review).toContainText(steps[index].prompt);
    }
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator(".contract-status")).toContainText("1 of 3");
  });
}

test("a passing follow-up accepts a sound alternative and abandoning it does not complete the lesson", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("barbu.practiceSeed.v1", "1"));
  await openPass(page);
  await select(page, ["QS", "2C", "4C"]);
  await page.getByRole("button", { name: "Check pass", exact: true }).click();
  await page.getByRole("button", { name: "Try another example", exact: true }).click();
  await select(page, ["QS", "3D", "6D"]);
  await page.getByRole("button", { name: "Check pass", exact: true }).click();
  await expect(page.getByLabel("Hearts pass practice cards")).toContainText("Good pass. A sound alternative");
  await expect(page.getByRole("button", { name: "Try another example", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await expect(page.getByLabel("Hearts course progress")).toContainText("0 / 7 complete");
  expect(await page.evaluate(key => localStorage.getItem(key), learningEvidenceKey)).toBeNull();
});
