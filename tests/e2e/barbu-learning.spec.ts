import { expect, test, type Page } from "@playwright/test";
import { guidedLessons } from "../../src/lessons/catalog";
import { barbuDef } from "../../src/games/barbu";
import { formatCardText } from "../../src/presentation/cardDisplay";

async function openLearn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function startLesson(page: Page, index: number) {
  await page.locator(`[data-skill="${barbuDef.learnSteps[index].id}"] .lesson-topic`).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
}
async function select(page: Page, id: string) {
  await page.getByLabel("Your hand", { exact: true }).getByRole("button", { name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true }).click();
}

for (const viewport of [{ width: 320, height: 568 }, { width: 820, height: 1180 }]) {
  test(`Barbu's 21 guided decisions fade hints, record results and fit at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await openLearn(page);
    for (const [topic, lesson] of guidedLessons.entries()) {
      await startLesson(page, topic);
      for (const [index, trick] of lesson.tricks.entries()) {
        await expect(page.getByRole("heading", { name: lesson.contract, exact: true })).toBeInViewport();
        await expect(page.locator(".contract-status")).toContainText(`${index + 1} of 3`);
        const card = trick.hand.find(card => trick.cardOutcomes[card.id] === "good")
          ?? trick.hand.find(card => trick.legalCardIds.includes(card.id))!;
        await select(page, card.id);
        if (index === 2) await expect(page.locator(".table-play-panel .explanation")).toHaveCount(0);
        else await expect(page.locator(".table-play-panel .explanation")).toHaveText(formatCardText(trick.emptyExplanation));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const play = page.getByRole("button", { name: "Play selected", exact: true });
        await expect(play).toBeInViewport();
        await expect.poll(() => page.locator("img.card-face").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        if (index === 2) await page.screenshot({ path: info.outputPath(`${lesson.id}-question.png`) });
        await play.click();
        await expect(page.locator(".table-play-panel .explanation")).toHaveText(formatCardText(trick.playedExplanations[card.id]!));
        const next = page.getByRole("button", { name: index === 2 ? "Finish lesson" : "Next trick", exact: true });
        await expect(next).toBeInViewport();
        const boxes = await page.locator(".table-play-panel > *").evaluateAll(elements => elements
          .map(element => element.getBoundingClientRect()).filter(box => box.height > 0).map(box => ({ top: box.top, bottom: box.bottom })));
        for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
        if (index === 2) await page.screenshot({ path: info.outputPath(`${lesson.id}-feedback.png`) });
        await next.click();
      }
      await expect(page.getByLabel("Learning summary")).toContainText("3 of 3 decisions matched the lesson's goal");
      await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
      await expect(page.getByLabel("Barbu course progress")).toContainText(`${topic + 1} / 7 complete`);
    }
  });
}

test("Barbu feedback follows the selected card and resetting does not duplicate results", async ({ page }) => {
  await openLearn(page);
  await startLesson(page, 5);
  await select(page, "2D");
  await page.getByRole("button", { name: "Play selected", exact: true }).click();
  await expect(page.locator(".table-play-panel .result")).toHaveText("Right wins with A♣. 5 reward points for Right.");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await select(page, "7H");
  await page.getByRole("button", { name: "Play selected", exact: true }).click();
  await expect(page.locator(".table-play-panel .result")).toHaveText("You win with 7♥. 5 reward points for you.");
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await select(page, "KH");
  await expect(page.getByRole("button", { name: "Play selected", exact: true })).toBeDisabled();
  await expect(page.locator(".outcome")).toHaveText("Illegal");
  for (const [i, id] of ["AC", "JH"].entries()) {
    await select(page, id);
    await page.getByRole("button", { name: "Play selected", exact: true }).click();
    await page.getByRole("button", { name: i === 0 ? "Next trick" : "Finish lesson", exact: true }).click();
  }
  await expect(page.getByLabel("Learning summary")).toContainText("3 of 3 decisions matched the lesson's goal");
  await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  await startLesson(page, 6);
  await select(page, "7H");
  await page.getByRole("button", { name: "Play selected", exact: true }).click();
  await expect(page.locator(".table-play-panel .result")).toHaveText("You played 7♥ and opened hearts.");
  await expect(page.getByLabel("Domino lesson layout")).toContainText("7♥");
});
