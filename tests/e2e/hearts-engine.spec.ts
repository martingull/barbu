import { expect, test, type Page } from "@playwright/test";
import native from "../fixtures/hearts-native-save.json" with { type: "json" };
import { createHeartsSession, transitionHeartsSession, heartsSessionSettlement } from "../../src/domain/heartsSession";
import { saveHeartsSession } from "../../src/persistence/heartsSave";

const key = "barbu.savedHeartsRun.v1";

async function mockNative(page: Page) {
  await page.addInitScript(() => Object.assign(window, { isTauri: true, structuredClone: undefined, nativeCommands: [] as string[],
    __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } }
  }));
}

async function openHearts(page: Page) {
  await page.getByRole("button", { name: "Open Hearts", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}

async function passCards(page: Page) {
  const hand = page.getByLabel("Your Hearts passing hand");
  for (let i = 0; i < 3; i++) await hand.locator("button").nth(i).click();
  await page.getByRole("button", { name: "Pass cards", exact: true }).click();
}

async function commands(page: Page) {
  return page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands);
}

test("Hearts passes, plays and resumes review in TypeScript with a native runtime", async ({ page }, info) => {
  await mockNative(page);
  await page.goto("/");
  await openHearts(page);
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await passCards(page);
  await page.getByLabel("Your Hearts hand").locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  expect(await commands(page)).toEqual([]);
  await page.screenshot({ path: info.outputPath("hearts-shared-engine.png"), fullPage: true });
  await page.reload();
  await openHearts(page);
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).fullHandReviewTrickCount, key)).toBe(0);
  expect(await commands(page)).toEqual([]);
});

for (const passing of [true, false]) {
  test(`Hearts resumes a native ${passing ? "passing" : "playing"} save without losing progress`, async ({ page }) => {
    await mockNative(page);
    const fixture = native.cases[1];
    await page.goto("/");
    await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved: {
      version: 1, view: passing ? "heartsPass" : "fullHand", passDirection: "left",
      scores: { Tutor: 12, Right: 15, You: 3, Left: 8 }, results: [],
      heartsPassingHand: passing ? native.passingHand : null, fullHand: passing ? null : fixture.savedHand,
      heartsPassSelectedCardIds: passing ? native.cardIds : [], fullHandReviewTrickCount: 0,
      usingBrowserFullHand: false, usingBrowserHeartsPass: false, savedAt: "before-migration"
    } });
    await page.reload();
    await openHearts(page);
    await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
    if (passing) {
      await expect(page.getByLabel("Your Hearts passing hand").getByRole("button", { pressed: true })).toHaveCount(3);
      await page.getByRole("button", { name: "Pass cards", exact: true }).click();
    } else {
      await page.getByLabel("Your Hearts hand").getByRole("button", {
        name: `${fixture.cardId.slice(0, -1)} ${fixture.cardId.at(-1)}`, exact: true
      }).click();
      await page.getByRole("button", { name: "Play card", exact: true }).click();
    }
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    const expected = passing ? fixture.initialHand : fixture.nextHand;
    expect(saved.fullHand.hands).toEqual(expected.hands);
    expect(saved.fullHand.completedTricks.map((trick: { winnerIndex: number }) => trick.winnerIndex))
      .toEqual(expected.completedTricks.map(trick => trick.winnerIndex));
    expect(saved.scores).toEqual({ Tutor: 12, Right: 15, You: 3, Left: 8 });
    expect(saved.usingBrowserFullHand).toBe(true);
    expect(await commands(page)).toEqual([]);
  });
}

test("Hearts practice retains its generator and cannot overwrite a passing match", async ({ page }) => {
  await mockNative(page);
  await page.goto("/");
  await openHearts(page);
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await page.getByLabel("Your Hearts passing hand").locator("button").first().click();
  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await page.getByLabel("Hearts practice drills").getByRole("button", { name: /Pass three/ }).click();
  await expect(page.getByLabel("Your Hearts pass practice hand")).toBeVisible();
  expect(await commands(page)).toEqual(["generate_hearts_pass_practice"]);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByLabel("Your Hearts passing hand").getByRole("button", { pressed: true })).toHaveCount(1);
});

test("Hearts survives malformed saves and failed writes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, view: "fullHand", fullHand: {} })), key);
  await page.reload();
  await openHearts(page);
  await expect(page.getByRole("button", { name: "Continue Hearts", exact: true })).toHaveCount(0);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, key);
  await page.getByRole("button", { name: "Play Hearts", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toBeVisible();
  await passCards(page);
  await page.getByLabel("Your Hearts hand").locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Hearts replay preserves the deal and a double next-hand settles only once", async ({ page }) => {
  let session = createHeartsSession(8);
  for (const card of session.fullHand.playerHand.slice(0, 3)) session = transitionHeartsSession(session, { type: "select-pass", cardId: card.id });
  session = transitionHeartsSession(session, { type: "pass" });
  const initial = session.fullHand;
  for (let i = 0; i < 13; i++) {
    session = transitionHeartsSession(session, { type: "next-trick" });
    session = transitionHeartsSession(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  }
  await page.goto("/");
  const saved = saveHeartsSession(session, "now");
  expect(saved).not.toBeNull();
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
  await page.reload();
  await openHearts(page);
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  const replay = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(replay.fullHand.hands).toEqual(initial.hands);
  expect(replay.fullHand.currentTrick).toEqual(initial.currentTrick);
  expect(replay.scores).toEqual(session.scores);
  expect(replay.results).toEqual([]);
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
  await page.reload();
  await openHearts(page);
  await page.getByRole("button", { name: "Continue Hearts", exact: true }).click();
  await page.getByRole("button", { name: "Next hand", exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole("heading", { name: "Pass cards", exact: true })).toBeVisible();
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(next.passDirection).toBe("right");
  expect(next.results).toHaveLength(1);
  expect(next.scores).toEqual(heartsSessionSettlement(session).scores);
});
