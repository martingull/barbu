import { expect, test, type Page } from "@playwright/test";
import { createGinSession, ginComplete, transitionGinSession } from "../../src/domain/ginRummySession";
import { chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import type { GinSettings } from "../../src/domain/ginRummyRules";
import { ginSaveKey, saveGinSession } from "../../src/persistence/ginRummySave";
import { ginSettingsKey } from "../../src/features/gin-rummy/ginRummyFeature";
import { ginTopics } from "../../src/games/ginRummy";
import { ginLearningSteps, ginExerciseChoices, ginExerciseAnswer, ginSelectsCard } from "../../src/lessons/gin-rummy/exercises";

const american: GinSettings = { profile: "american" };
async function open(page: Page) {
  await page.getByRole("button", { name: "Open Gin Rummy", exact: true }).click();
}

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
  test(`Gin settings preserve legacy games and fit ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    const { settings: _, ...legacy } = saveGinSession(createGinSession(1), "now");
    await page.evaluate(({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)), { key: ginSaveKey, legacy });
    await page.reload(); await open(page);
    await page.getByRole("button", { name: "American 25/25", exact: true }).click();
    const settings = page.getByRole("region", { name: "Gin Rummy scoring settings", exact: true });
    await expect(settings.getByRole("button")).toHaveCount(2);
    await expect(settings.getByRole("group", { name: "Game target", exact: true })).toHaveCount(0);
    await expect(settings).toContainText("Saved game: Classic 20/10, first to 100.");
    await settings.getByText("Scoring agreement", { exact: true }).click();
    await expect(settings).toContainText("Gin bonus 25; undercut bonus 25; box bonus 25");
    await expect(settings).toContainText("First to 100 hand points.");
    const boxes = await settings.getByRole("button").evaluateAll(buttons => buttons.map(button => {
      const box = button.getBoundingClientRect(); return { x: box.x, right: box.right, height: box.height, width: box.width, content: button.scrollWidth };
    }));
    for (const box of boxes) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(size.width); expect(box.height).toBeGreaterThanOrEqual(44); expect(box.content).toBeLessThanOrEqual(box.width + 1); }
    await page.screenshot({ path: info.outputPath("gin-scoring-settings.png"), fullPage: true, scale: "css" });
    await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
    await expect(page.locator(".table-play-topbar")).toContainText("Classic 20/10");
    await expect(page.locator(".table-play-topbar .eyebrow")).toBeVisible();
    await expect(page.getByLabel("Gin Rummy score", { exact: true })).toContainText("Target100");
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await page.getByRole("button", { name: "Play Gin Rummy", exact: true }).click();
    await expect(page.locator(".table-play-topbar")).toContainText("American 25/25");
    await expect(page.locator(".table-play-topbar .eyebrow")).toBeVisible();
    await expect(page.getByLabel("Gin Rummy score", { exact: true })).toContainText("Target100");
    await expect(page.getByLabel("Gin turn actions")).toBeInViewport();
    await page.screenshot({ path: info.outputPath("gin-american-play.png"), scale: "css" });
    await page.reload();
    await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
    await expect(page.locator(".table-play-topbar")).toContainText("American 25/25");
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).settings, ginSaveKey)).toEqual(american);
    expect(errors).toEqual([]);
  });
}

test("American Gin lessons use 25-point answers and guidance without resetting shared skills or saves", async ({ page }, info) => {
  await page.goto("/");
  const saved = JSON.stringify(saveGinSession(createGinSession(9), "now"));
  await page.evaluate(({ key, saved, progress }) => {
    localStorage.setItem(key, saved); localStorage.setItem("barbu.courseProgress.v1", JSON.stringify(progress));
  }, { key: ginSaveKey, saved, progress: Object.fromEntries(ginTopics.map(topic => [topic.id, true])) });
  await page.reload(); await open(page);
  await page.getByRole("button", { name: "American 25/25", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Gin Rummy course progress")).toContainText("6 / 7 complete");
  await page.getByRole("button", { name: "Continue lesson", exact: true }).click();
  await expect(page.getByRole("list", { name: "Gin Rummy concept points", exact: true })).toContainText("plus 25");
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  for (const [index, step] of ginLearningSteps("settlement", american).entries()) {
    const choice = ginExerciseChoices("settlement", step).find(choice => ginExerciseAnswer("settlement", step, choice.id).good)!;
    if (ginSelectsCard("settlement", step)) {
      const card = step.hand.find(card => card.id === choice.id)!;
      await page.getByLabel("Your Gin Rummy exercise hand").getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
    } else await page.getByRole("button", { name: choice.label, exact: true }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await expect(page.getByRole("region", { name: "Hand score breakdown", exact: true })).toContainText("25 points");
    if (index === 2) await page.screenshot({ path: info.outputPath("gin-american-tied-undercut.png"), scale: "css" });
    await page.getByRole("button", { name: index === 2 ? "Finish topic" : "Next decision", exact: true }).click();
  }
  await expect(page.getByRole("status")).toHaveText("Gin Rummy learning path complete.");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("barbu.courseProgress.v1")!))).toMatchObject({ "gin-settlement": true, "gin-american-settlement": true, "gin-turn": true });
  await page.getByRole("button", { name: "Back to Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start guided hand", exact: true }).click();
  await expect(page.locator(".table-play-topbar")).toContainText("American 25/25");
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  expect(await page.evaluate(key => localStorage.getItem(key), ginSaveKey)).toBe(saved);
});

test("American Gin result shows the fixed 100-point target and 25-point boxes after a full game", async ({ page }, info) => {
  let session = createGinSession(1, american), count = 0;
  while (!ginComplete(session) && count++ < 2000) session = transitionGinSession(session, session.hand.phase === "complete"
    ? { type: "next", seed: count } : chooseGinAction(ginObservation(session)));
  expect(ginComplete(session)).toBe(true);
  await page.goto("/");
  await page.evaluate(({ key, value, settingsKey, settings }) => {
    localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { key: ginSaveKey, value: saveGinSession(session, "now"), settingsKey: ginSettingsKey, settings: american });
  await page.reload();
  await page.getByRole("button", { name: "Continue Gin Rummy", exact: true }).click();
  await expect(page.getByRole("heading", { name: session.scores[0] >= 100 ? "You won the game" : "Barbu won the game", exact: true })).toBeVisible();
  const scoring = page.getByRole("region", { name: "Gin Rummy final scoring", exact: true });
  await expect(scoring).toContainText("First to 100 hand points wins.");
  await expect(scoring).toContainText("Box bonus (25 per win)");
  await expect(page.locator(".table-play-topbar .eyebrow")).toBeVisible();
  await expect(page.getByRole("button", { name: "New game", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next hand", exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("gin-american-game-result.png"), fullPage: true, scale: "css" });
});
