import { test, expect, type Page } from "@playwright/test";
import { startBrowserWhistHand, playBrowserWhistCard } from "../../src/domain/trickTakingHand";
import { courseCatalog } from "../../src/courseContent";

const saveKey = "barbu.savedWhistRun.v1";
const pair = (scores: number[]) => ({ playerSide: scores[0], opponentSide: scores[1] });

function completeHand(seed: number, dealer: number) {
  let state = startBrowserWhistHand(seed, dealer);
  for (let i = 0; i < 13 && state.status !== "complete"; i++) state = playBrowserWhistCard(state, state.legalCardIds[0]);
  return state;
}

async function openWhist(page: Page) {
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play" }).click();
}

test("Whist Learn and Practice stay reachable on small screens and complete each lesson", async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await openWhist(page);
  for (const tab of ["Learn", "Practice"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tabs = page.getByRole("tablist");
    const last = await tabs.getByRole("tab").last().boundingBox();
    const rail = await tabs.boundingBox();
    expect(Math.abs(last!.x + last!.width - rail!.x - rail!.width)).toBeLessThan(1);
    expect(await tabs.getByRole("tab").evaluateAll(buttons => buttons.every(button => {
      const range = document.createRange();
      range.selectNodeContents(button);
      const text = range.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      return text.left >= box.left + 6 && text.right <= box.right - 6;
    }))).toBe(true);
    await page.screenshot({ path: info.outputPath(`whist-${tab}-320.png`), fullPage: true });
  }
  for (const course of courseCatalog.filter(course => course.game === "whist")) {
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.getByLabel("Whist lesson path").getByRole("button", { name: new RegExp(course.title) }).click();
    await expect(page.getByLabel("Whist course content")).toContainText(course.concept.body);
    await page.getByRole("button", { name: "See example" }).click();
    await expect(page.getByLabel(course.example.ariaLabel)).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${course.id}-example-320.png`), fullPage: true });
    await page.getByRole("button", { name: "Practice decision" }).click();
    for (let decision = 0; decision < 3; decision++) {
      await page.locator(".drill-hand .hand-card.legal").first().click();
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: decision === 2 ? "Review session" : "Next decision", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finish Whist", exact: true }).click();
  }
});

test("Whist session choices stay inline with readable labels and keyboard focus", async ({ page }, info) => {
  await page.goto("/");
  await openWhist(page);
  const group = page.getByRole("radiogroup", { name: "Whist session" });
  const single = group.getByRole("radio", { name: /Single game/ });
  const rubber = group.getByRole("radio", { name: /Rubber/ });
  await expect(single).toBeChecked();
  await rubber.check();
  await expect(rubber).toBeChecked();
  await expect(single).not.toBeChecked();
  await expect(group.locator("select")).toHaveCount(0);
  for (const width of [320, 360, 1024]) {
    await page.setViewportSize({ width, height: 740 });
    await rubber.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(single).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(rubber).toBeChecked();
    await expect(group).toHaveCSS("color", "rgb(219, 231, 209)");
    await expect(group.locator("input:checked + span")).toHaveCSS("outline-style", "solid");
    const control = await group.boundingBox();
    const action = await page.getByRole("button", { name: "Play Whist", exact: true }).boundingBox();
    expect((await rubber.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(control!.x).toBe(action!.x);
    expect(control!.width).toBe(action!.width);
    expect(control!.y + control!.height + 4).toBeLessThanOrEqual(action!.y);
    await page.screenshot({ path: info.outputPath(`whist-session-${width}.png`), fullPage: true });
  }
});

test("Whist rubber selection and turned trump fit a small table", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("barbu.practiceSeed.v1", "1"));
  await page.goto("/");
  await openWhist(page);
  await page.getByRole("radio", { name: /Rubber/ }).check();
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  await expect(page.getByLabel("Whist rubber games")).toContainText("0-0");
  await expect(page.getByLabel("Turned trump", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Whist dealer", { exact: true })).toContainText("Right");
  const score = page.getByLabel("Whist match score");
  await page.screenshot({ path: info.outputPath("whist-rubber-deal.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByLabel("Whist rubber games").getByText("0-0", { exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel("Whist dealer", { exact: true }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("whist-320-turned.png"), fullPage: true });
  await page.setViewportSize({ width: 360, height: 740 });
  const beforePlay = await score.boundingBox();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByLabel("Turned trump", { exact: true })).toHaveCount(0);
  expect((await score.boundingBox())?.height).toBe(beforePlay?.height);
  await page.screenshot({ path: info.outputPath("whist-rubber-first-trick.png"), fullPage: true });
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  for (const viewport of [{ width: 360, height: 640 }, { width: 320, height: 568 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
    await expect(page.getByLabel("Whist rubber games").getByText("0-0", { exact: true })).toBeVisible();
    const hand = await page.getByLabel("Your Whist hand").boundingBox();
    const table = await page.getByLabel("Whist hand table", { exact: true }).boundingBox();
    expect(table!.y + table!.height).toBeLessThanOrEqual(hand!.y);
    await page.screenshot({ path: info.outputPath(`whist-${viewport.width}.png`), fullPage: true });
  }
});

test("Whist rubber resumes between games without settling twice and rotates dealer", async ({ page }) => {
  const fullHand = completeHand(8, 1);
  const winner = fullHand.completedTricks.filter(trick => trick.winnerIndex % 2 === 0).length >= 7 ? "playerSide" : "opponentSide";
  const saved = { version: 1, mode: "rubber", scores: pair([4, 4]), games: pair([0, 0]), results: [],
    fullHand, fullHandReviewTrickCount: 13, usingBrowserFullHand: true, savedAt: new Date().toISOString() };
  await page.goto("/");
  await page.evaluate(({ key, saved }) => {
    localStorage.setItem(key, JSON.stringify(saved));
    localStorage.setItem("barbu.practiceSeed.v1", "1000");
  }, { key: saveKey, saved });
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist" }).click();
  await expect(page.getByRole("button", { name: "Next game", exact: true })).toBeVisible();
  // Two synchronous taps exercise the pending native-deal boundary.
  await page.getByRole("button", { name: "Next game", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  const readSave = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey);
  await expect.poll(async () => (await readSave()).games[winner]).toBe(1);
  const next = await readSave();
  expect(next.scores).toEqual(pair([0, 0]));
  expect(next.results).toHaveLength(1);
  expect(next.fullHand.whistDealer).toBe(2);
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist" }).click();
  expect((await readSave()).games[winner]).toBe(1);
  await expect(page.getByLabel("Whist rubber games")).toContainText(winner === "playerSide" ? "1-0" : "0-1");

  saved.games[winner] = 1;
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: saveKey, saved });
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist" }).click();
  await expect(page.getByRole("heading", { name: /won the rubber/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "New match", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New match", exact: true }).click();
  const fresh = await readSave();
  expect(fresh.games).toEqual(pair([0, 0]));
  expect(fresh.scores).toEqual(pair([0, 0]));
  expect(fresh.mode).toBe("rubber");
});

test("Whist legacy saves default to a single game and replay the same deal", async ({ page }) => {
  const fullHand = completeHand(8, 0);
  delete fullHand.whistDealer;
  delete fullHand.whistTurnedTrump;
  const saved = { version: 1, scores: pair([0, 0]), results: [], fullHand,
    fullHandReviewTrickCount: 13, usingBrowserFullHand: true, savedAt: new Date().toISOString() };
  await page.goto("/");
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: saveKey, saved });
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist" }).click();
  await expect(page.getByRole("heading", { name: /won the hand/ })).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.getByLabel("Your Whist hand").locator(".full-hand-card")).toHaveCount(13);
  const resumed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(resumed.mode).toBe("game");
  expect(resumed.games).toEqual(pair([0, 0]));
  expect(resumed.scores).toEqual(pair([0, 0]));
  expect(resumed.fullHand.id).toBe(fullHand.id);
  expect(resumed.fullHand.whistDealer).toBe(0);
  expect(resumed.fullHand.playerHand).toEqual(startBrowserWhistHand(8, 0).playerHand);
});
