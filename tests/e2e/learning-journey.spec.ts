import { expect, test, type Page } from "@playwright/test";
import { heartsDef } from "../../src/games/hearts";
import { whistDef } from "../../src/games/whist";
import { spadesDef } from "../../src/games/spades";
import { bridgeDef } from "../../src/games/bridge";
import { barbuDef } from "../../src/games/barbu";
import { ginRummyDef } from "../../src/games/ginRummy";

const progressKey = "barbu.courseProgress.v1";
async function progress(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}"), progressKey);
}
async function savedState(page: Page, key: string) {
  return page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!value) return null;
    const { savedAt, ...state } = value;
    return state;
  }, key);
}
async function openLearn(page: Page, game: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function answer(page: Page) {
  await page.locator(".drill-hand .hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function finish(page: Page) {
  for (let i = 0; i < 10; i++) {
    await answer(page);
    const done = page.getByRole("button", { name: "Finish topic", exact: true });
    if (await done.isVisible()) { await done.click(); return; }
    await page.getByRole("button", { name: "Next decision", exact: true }).click();
  }
  throw Error("Exercise did not finish");
}

for (const [game, topic, saveKey] of [
  ["Hearts", "hearts-avoid", "barbu.savedHeartsRun.v1"],
  ["Whist", "whist-follow-suit", "barbu.savedWhistRun.v1"],
  ["Spades", "spades-follow-suit", "barbu.savedSpadesRun.v1"],
  ["Bridge", "bridge-declarer", "barbu.savedBridgeRun.v1"],
  ["Barbu", "meet-contract", "barbu.savedPlayRun.v1"],
]) {
  test(`${game} shortcut credits only its topic and resumes the saved game`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await openLearn(page, game);
    await page.getByRole("tab", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: `Play ${game}`, exact: true }).click();
    const saved = await savedState(page, saveKey);
    expect(saved).not.toBeNull();
    await page.getByRole("button", { name: "Table", exact: true }).first().click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.locator(`[data-skill="${topic}"] .exercise-shortcut`).click();
    await finish(page);
    expect(await progress(page)).toEqual({ [topic]: true });
    await expect(page.getByRole("status")).toHaveText("Topic complete.");
    const resume = page.getByRole("button", { name: `Continue ${game}`, exact: true });
    await expect(resume).toBeInViewport();
    await expect(page.getByRole("button", { name: "Next topic", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`${game}-learn-result.png`) });
    await resume.click();
    expect(await savedState(page, saveKey)).toEqual(saved);
    await expect(page.getByLabel("Learning summary")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("leaving the course after one decision does not complete the topic", async ({ page }) => {
  await openLearn(page, "Hearts");
  await page.getByRole("button", { name: "Start learning", exact: true }).click();
  await page.getByRole("button", { name: "See example", exact: true }).click();
  await page.getByRole("button", { name: "Try cards", exact: true }).click();
  await answer(page);
  await page.getByRole("button", { name: "Finish session", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Topic paused.");
  expect(await progress(page)).toEqual({});
  await expect(page.getByRole("button", { name: "Next topic", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await finish(page);
  expect(await progress(page)).toEqual({ "hearts-object": true });
  await page.getByRole("button", { name: "Next topic", exact: true }).click();
  await expect(page.getByLabel("Drill decision")).toBeVisible();
  await expect(page.getByText("Decision 1 of 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await expect(page.getByLabel("Hearts course progress")).toContainText("1 / 7 complete");
});

for (const [game, definition, saveKey] of [
  ["Hearts", heartsDef, "barbu.savedHeartsRun.v1"],
  ["Whist", whistDef, "barbu.savedWhistRun.v1"],
  ["Spades", spadesDef, "barbu.savedSpadesRun.v1"],
  ["Bridge", bridgeDef, "barbu.savedBridgeRun.v1"],
  ["Barbu", barbuDef, "barbu.savedPlayRun.v1"],
  ["Gin Rummy", ginRummyDef, "barbu.savedGinRummyRun.v1"],
] as const) {
  test(`${game} resets only its lessons and retains the reset after reload`, async ({ page }, info) => {
    await openLearn(page, game);
    await page.getByRole("tab", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: `Play ${game}`, exact: true }).click();
    const saved = await savedState(page, saveKey);
    expect(saved).not.toBeNull();
    const otherProgress = { "hearts-introduction": true, [game === "Bridge" ? "hearts-queen" : "bridge-bidding"]: true };
    await page.evaluate(({ key, ids, other }) => localStorage.setItem(key, JSON.stringify({
      ...Object.fromEntries(ids.map(id => [id, true])), ...other
    })), { key: progressKey, ids: definition.learnSteps.map(step => step.id), other: otherProgress });
    await openLearn(page, game);
    const historyBefore = await page.evaluate(() => localStorage.getItem("barbu.playHistory.v1"));
    await expect(page.getByRole("button", { name: "Review lessons", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Reset lessons", exact: true }).click();
    await expect(page.getByLabel(definition.table.learn.progressAriaLabel)).toContainText(`0 / ${definition.learnSteps.length} complete`);
    expect(await progress(page)).toEqual(otherProgress);
    expect(await savedState(page, saveKey)).toEqual(saved);
    expect(await page.evaluate(() => localStorage.getItem("barbu.playHistory.v1"))).toBe(historyBefore);
    await openLearn(page, game);
    await expect(page.getByLabel(definition.table.learn.progressAriaLabel)).toContainText(`0 / ${definition.learnSteps.length} complete`);
    await page.screenshot({ path: info.outputPath(`${game}-lessons-reset.png`) });
    if (game === "Hearts") {
      await page.getByRole("button", { name: "Start learning", exact: true }).click();
      await page.getByRole("button", { name: "See example", exact: true }).click();
      await page.getByRole("button", { name: "Try cards", exact: true }).click();
      await finish(page);
      await page.getByRole("button", { name: "Next topic", exact: true }).click();
      await finish(page);
      expect(await progress(page)).toEqual({ ...otherProgress, "hearts-object": true, "hearts-queen": true });
      expect(await savedState(page, saveKey)).toEqual(saved);
    } else await expect(page.getByRole("button", { name: "Start learning", exact: true })).toBeVisible();
  });
}

test("dummy decisions do not also complete the declarer topic", async ({ page }) => {
  await openLearn(page, "Bridge");
  await page.locator('[data-skill="bridge-dummy"] .exercise-shortcut').click();
  await finish(page);
  expect(await progress(page)).toEqual({ "bridge-dummy": true });
});

test("an extra first-trick exercise does not complete unrelated Hearts topics", async ({ page }) => {
  await openLearn(page, "Hearts");
  await page.locator('[data-skill="first-trick"] button').click();
  await finish(page);
  await expect(page.getByRole("status")).toHaveText("Exercise complete.");
  expect(await progress(page)).toEqual({});
});

test("the last topic offers play instead of looping back to completed lessons", async ({ page }) => {
  await page.addInitScript(({ key, ids }) => localStorage.setItem(key, JSON.stringify(Object.fromEntries(ids.map(id => [id, true])))),
    { key: progressKey, ids: heartsDef.learnSteps.filter(step => step.id !== "hearts-score").map(step => step.id) });
  await openLearn(page, "Hearts");
  await page.locator('[data-skill="hearts-score"] .exercise-shortcut').click();
  await finish(page);
  await expect(page.getByRole("button", { name: "Next topic", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand")).toBeVisible();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 820, height: 1180 }]) {
  test(`learning result fits and its review scrolls at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openLearn(page, "Hearts");
    await page.locator('[data-skill="hearts-avoid"] .exercise-shortcut').click();
    await finish(page);
    await expect(page.getByRole("button", { name: "Play Hearts", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath("learning-result.png") });
    await page.getByText("Review decisions", { exact: true }).click();
    await page.getByRole("button", { name: "Back to Learn", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Back to Learn", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("learning-review.png") });
  });
}
