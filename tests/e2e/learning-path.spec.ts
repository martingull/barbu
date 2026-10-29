import { expect, test, type Page } from "@playwright/test";
import { heartsDef } from "../../src/games/hearts";

const evidenceKey = "barbu.learningEvidence.v1";
const progressKey = "barbu.courseProgress.v1";
async function openLearn(page: Page, game = "Hearts") {
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
}
async function evidence(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), evidenceKey);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const image of await page.locator(".character-portrait img").all()) {
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
}

test("learning guides use full logo portraits with stable dimensions", async ({ page }, info) => {
  for (const [game, name, source] of [
    ["Barbu", "Barbu", "128x128@2x.png"],
    ["Hearts", "Queen of Spades", "/characters/queen-of-spades.png"],
    ["Card Counting I", "Jack of Clubs", "/characters/jack-of-clubs.png"]
  ]) {
    await openLearn(page, game);
    const portrait = page.locator(".learn-start .character-portrait");
    const img = portrait.getByRole("img", { name, exact: true });
    await expect(img).toHaveAttribute("src", new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.naturalWidth > 0)).toBe(true);
    const geometry = await img.evaluate(image => {
      const outer = image.parentElement!.getBoundingClientRect();
      const inner = image.getBoundingClientRect();
      return { width: outer.width, height: outer.height, fits: inner.width <= outer.width && inner.height <= outer.height };
    });
    expect(geometry).toEqual({ width: 36, height: 36, fits: true });
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`${name}-portrait.png`) });
  }
});

for (const size of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
  test(`learning path, coach and decisions fit ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    await openLearn(page);
    await expect(page.getByRole("progressbar", { name: "Lessons completed" })).toHaveAttribute("aria-valuenow", "0");
    await expect(page.locator('[aria-current="step"]')).toContainText("Object of Hearts");
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath("learning-path.png"), fullPage: true });
    await expect(page.getByRole("button", { name: "Start lesson", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeInViewport({ ratio: 1 });
    const guided = (await page.getByRole("region", { name: "Play with guidance", exact: true }).boundingBox())!;
    const path = (await page.getByRole("region", { name: "Choose a topic", exact: true }).boundingBox())!;
    expect(path.y).toBeGreaterThanOrEqual(guided.y + guided.height);
    await expect(page.getByLabel("Learning resources")).not.toContainText("Guided hand");
    await expect(page.getByRole("button", { name: "Play Hearts", exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("learn-choices.png") });
    await page.getByRole("button", { name: "Start lesson", exact: true }).click();
    await expect(page.getByRole("img", { name: "Queen of Spades", exact: true })).toBeVisible();
    await noOverflow(page);
    await expect(page.getByRole("button", { name: "See example", exact: true })).toHaveCount(0);
    await page.locator(".drill-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await noOverflow(page);
    await expect(page.getByRole("button", { name: "Next decision", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath("learning-feedback.png"), fullPage: true });
  });
}

test("legacy completion stays unscored; full attempts persist separately and early exits do not count", async ({ page }) => {
  await page.addInitScript(({ progressKey }) => {
    if (!localStorage.getItem(progressKey)) localStorage.setItem(progressKey, JSON.stringify({ "hearts-queen": true }));
  }, { progressKey });
  await openLearn(page);
  await expect(page.locator('[data-skill="hearts-queen"]')).toContainText("Complete");
  await expect(page.locator('[data-skill="hearts-queen"]')).not.toContainText("last attempt");
  await page.locator('[data-skill="hearts-avoid"] .exercise-shortcut').click();
  await page.locator(".drill-hand .hand-card.legal").first().click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Finish session", exact: true }).click();
  expect(await evidence(page)).toBeNull();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  let total = 0;
  for (let i = 0; i < 6; i++) {
    await page.locator(".drill-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    total++;
    const finish = page.getByRole("button", { name: "Finish topic", exact: true });
    if (await finish.isVisible()) { await finish.click(); break; }
    await page.getByRole("button", { name: /^(Next decision|Try another example)$/ }).click();
  }
  const stored = await evidence(page);
  expect(stored.skills["hearts-avoid"]).toMatchObject({ attempts: 1, total });
  await openLearn(page);
  await expect(page.locator('[data-skill="hearts-avoid"]')).toContainText(`${stored.skills["hearts-avoid"].correct}/${total} on last attempt`);
  await expect(page.locator('[data-skill="hearts-queen"]')).not.toContainText("last attempt");
});

test("guided play stays prominent with a saved match and a completed learning path", async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openLearn(page);
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await page.getByLabel("Your Hearts passing hand").getByRole("button").first().click();
  const saved = await page.evaluate(() => localStorage.getItem("barbu.savedHeartsRun.v1"));
  for (const count of [1, heartsDef.learnSteps.length]) {
    await page.evaluate(({ key, ids }) => localStorage.setItem(key, JSON.stringify(Object.fromEntries(ids.map(id => [id, true])))),
      { key: progressKey, ids: heartsDef.learnSteps.slice(0, count).map(step => step.id) });
    await openLearn(page);
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Continue Hearts", exact: true })).toHaveCount(0);
    if (count === 1) await expect(page.getByRole("button", { name: "Continue lesson", exact: true })).toBeInViewport({ ratio: 1 });
    else await expect(page.getByRole("button", { name: "Reset lessons", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`learn-with-save-${count}.png`) });
    expect(await page.evaluate(() => localStorage.getItem("barbu.savedHeartsRun.v1"))).toBe(saved);
  }
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand").locator('[aria-pressed="true"]')).toHaveCount(1);
});

test("games without a guided hand share lesson choices without offering unsupported guidance", async ({ page }) => {
  for (const game of ["Barbu", "Bridge", "Card Counting I"]) {
    await openLearn(page, game);
    await expect(page.getByRole("button", { name: "Start lesson", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Learning path", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start guided hand", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: new RegExp(`^(Continue|Play) ${game}$`) })).toHaveCount(0);
  }
});

test("completed path offers a revisit and resetting lessons clears only this game's evidence", async ({ page }) => {
  await page.addInitScript(({ progressKey, evidenceKey, ids }) => {
    localStorage.setItem(progressKey, JSON.stringify(Object.fromEntries([...ids, "whist-follow-suit"].map(id => [id, true]))));
    localStorage.setItem(evidenceKey, JSON.stringify({ version: 1, skills: {
      "hearts-object": { attempts: 2, correct: 1, total: 3 }, "whist-follow-suit": { attempts: 1, correct: 3, total: 3 }
    } }));
  }, { progressKey, evidenceKey, ids: heartsDef.learnSteps.map(step => step.id) });
  await openLearn(page);
  await expect(page.locator('[data-skill="hearts-object"]')).toContainText("Revisit");
  await page.getByRole("button", { name: "Revisit lesson", exact: true }).click();
  await expect(page.getByLabel("Drill decision")).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Reset lessons", exact: true }).click();
  expect((await evidence(page)).skills).toEqual({ "whist-follow-suit": { attempts: 1, correct: 3, total: 3 } });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual({ "whist-follow-suit": true });
  await expect(page.getByRole("button", { name: "Start lesson", exact: true })).toBeVisible();
});

test("Hearts passing records checked decisions and any follow-ups", async ({ page }) => {
  await openLearn(page);
  await page.locator('[data-skill="hearts-pass"] .exercise-shortcut').click();
  let total = 0;
  for (let i = 0; i < 6; i++) {
    const cards = page.getByLabel("Your Hearts pass practice hand").getByRole("button");
    for (let c = 0; c < 3; c++) await cards.nth(c).click();
    await page.getByRole("button", { name: "Check pass", exact: true }).click();
    total++;
    const finish = page.getByRole("button", { name: "Finish topic", exact: true });
    if (await finish.isVisible()) { await finish.click(); break; }
    await page.getByRole("button", { name: /^(Next pass|Try another example)$/ }).click();
  }
  expect((await evidence(page)).skills["hearts-pass"]).toMatchObject({ attempts: 1, total });
  await expect(page.getByLabel("Decision results").locator("li")).toHaveCount(total);
});
