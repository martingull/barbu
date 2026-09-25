import { expect, test } from "@playwright/test";
import { guidedLessons } from "../../src/lessons/catalog";
import { barbuDef } from "../../src/games/barbu";

test("Barbu review survives learning hands and other games without sharing their state", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const key = "barbu.savedPlayRun.v1";
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("button", { name: "Play Barbu", exact: true }).click();
  await page.screenshot({ path: info.outputPath("barbu-intro.png"), fullPage: true });
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Try cards: Domino\b/ }).click();
  await expect(page.getByLabel("Your Domino hand")).toBeVisible();
  const place = page.getByRole("button", { name: "Place card", exact: true });
  if (await place.isEnabled()) await place.click();
  else await page.getByRole("button", { name: "Pass", exact: true }).click();
  await page.screenshot({ path: info.outputPath("barbu-domino.png"), fullPage: true });
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(restored.fullHand).toEqual(JSON.parse(saved!).fullHand);
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  await page.screenshot({ path: info.outputPath("barbu-resumed-hand.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator(".full-hand-cards")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play card", exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("barbu-compact-hand.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("Barbu courses retain progress through reference navigation and compact-screen remounts", async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  for (const [index, step] of barbuDef.learnSteps.entries()) {
    await page.getByRole("button", { name: /^Reference\b/ }).click();
    await page.getByRole("button", { name: "Continue path", exact: true }).click();
    await page.getByRole("button", { name: "See example", exact: true }).click();
    if (index === 6) {
      await page.screenshot({ path: info.outputPath("barbu-domino-example.png"), fullPage: true });
      const panel = await page.locator(".table-play-panel").boundingBox();
      const laneBottom = await page.locator(".domino-layout > div").evaluateAll(lanes => Math.max(...lanes.map(lane => lane.getBoundingClientRect().bottom)));
      expect(laneBottom + 4).toBeLessThanOrEqual(panel!.y);
    }
    await page.getByRole("button", { name: "Try cards", exact: true }).click();
    const lesson = guidedLessons.find(lesson => lesson.id === step.lessonId)!;
    for (const [decision, trick] of lesson.tricks.entries()) {
      await expect(page.locator(".full-hand-card.selected")).toHaveCount(0);
      const card = trick.hand.find(card => trick.legalCardIds.includes(card.id))!;
      await page.getByLabel("Your hand", { exact: true }).getByRole("button", { name: `${card.rank} ${card.suit}`, exact: true }).click();
      await page.getByRole("button", { name: "Play selected", exact: true }).click();
      const next = page.getByRole("button", { name: decision === lesson.tricks.length - 1 ? "Finish lesson" : "Next trick", exact: true });
      await expect(next).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (decision === 0) await page.screenshot({ path: info.outputPath(`${step.id}-guided.png`), fullPage: true });
      await next.click();
    }
    await page.getByRole("button", { name: `Finish ${lesson.contract}`, exact: true }).click();
    await expect(page.getByLabel("Barbu course progress")).toContainText(`${index + 1} / 7 complete`);
  }
  await page.reload();
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.getByLabel("Barbu course progress")).toContainText("7 / 7 complete");
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error("Storage blocked"); }; });
  await page.getByRole("button", { name: /^Review results/ }).click();
  await page.getByRole("button", { name: "Finish review", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Learn", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
