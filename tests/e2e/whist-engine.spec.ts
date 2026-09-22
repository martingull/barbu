import { expect, test, type Page } from "@playwright/test";
import nativeFixture from "../fixtures/whist-native-save.json" with { type: "json" };

const saveKey = "barbu.savedWhistRun.v1";

async function mockNativeRuntime(page: Page) {
  await page.addInitScript(() => {
    Object.assign(window, {
      isTauri: true,
      structuredClone: undefined,
      nativeCommands: [] as string[],
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
          throw new Error(`Native command must not be needed by Whist: ${command}`);
        }
      }
    });
  });
}

async function openWhist(page: Page) {
  await page.getByRole("button", { name: /Open Whist/ }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}

async function nativeCommands(page: Page) {
  return page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands);
}

test("Whist deals and plays through TypeScript even with a native runtime", async ({ page }) => {
  await mockNativeRuntime(page);
  await page.goto("/");
  await openWhist(page);
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  await expect(page.getByLabel("Your Whist hand").locator(".full-hand-card")).toHaveCount(13);
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  expect(await nativeCommands(page)).toEqual([]);
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).fullHandReviewTrickCount, saveKey)).toBe(0);
});

test("Whist ignores a damaged save and can start a new game", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, fullHand: { contract: "Whist" } })), saveKey);
  await page.reload();
  await openWhist(page);
  await expect(page.getByRole("button", { name: "Continue Whist", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  await expect(page.getByLabel("Your Whist hand").locator(".full-hand-card")).toHaveCount(13);
  expect(errors).toEqual([]);
});

test("Whist remains playable when saving fails", async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, saveKey);
  await page.goto("/");
  await openWhist(page);
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toBeVisible();
  await page.locator(".full-hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("button", { name: "Continue Whist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
});

test("Whist practice leaves the saved match untouched", async ({ page }) => {
  await page.goto("/");
  await openWhist(page);
  await page.getByRole("button", { name: "Play Whist", exact: true }).click();
  const saved = await page.evaluate(key => localStorage.getItem(key), saveKey);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await page.getByLabel("Whist practice drills").getByRole("button", { name: /Opening lead/ }).click();
  await page.getByLabel("Your Whist hand").getByRole("button", { name: "5 S", exact: true }).click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(saved);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue Whist", exact: true }).click();
  await expect(page.getByLabel("Your Whist hand").locator(".full-hand-card")).toHaveCount(13);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).fullHand.id, saveKey)).toBe(JSON.parse(saved!).fullHand.id);
});

test("Whist resumes a Rust-created save without native commands or losing match progress", async ({ page }, info) => {
  await mockNativeRuntime(page);
  await page.goto("/");
  await page.evaluate(({ key, hand }) => localStorage.setItem(key, JSON.stringify({
    version: 1, mode: "rubber", scores: { playerSide: 2, opponentSide: 1 },
    games: { playerSide: 1, opponentSide: 0 }, results: [], fullHand: hand,
    fullHandReviewTrickCount: 0, usingBrowserFullHand: false, savedAt: new Date().toISOString()
  })), { key: saveKey, hand: nativeFixture.savedHand });
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist", exact: true }).click();
  await page.getByLabel("Your Whist hand").getByRole("button", {
    name: `${nativeFixture.cardId.slice(0, -1)} ${nativeFixture.cardId.at(-1)}`, exact: true
  }).click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(saved.fullHand.id).toBe(nativeFixture.savedHand.id);
  expect(saved.fullHand.completedTricks.map((trick: { winnerIndex: number }) => trick.winnerIndex))
    .toEqual(nativeFixture.nextHand.completedTricks.map(trick => trick.winnerIndex));
  expect(saved.scores).toEqual({ playerSide: 2, opponentSide: 1 });
  expect(saved.games).toEqual({ playerSide: 1, opponentSide: 0 });
  expect(saved.usingBrowserFullHand).toBe(true);
  expect(await nativeCommands(page)).toEqual([]);
  await page.screenshot({ path: info.outputPath("whist-shared-engine.png"), fullPage: true });
  await page.reload();
  await openWhist(page);
  await page.getByRole("button", { name: "Continue Whist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  expect(await nativeCommands(page)).toEqual([]);
});
