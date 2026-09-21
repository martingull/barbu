import { expect, test, type Page } from "@playwright/test";
import { bridgeLegacyCases } from "../fixtures/bridgeLegacy";
import { transitionBridgeSession, bridgeSessionSettlement } from "../../src/domain/bridgeSession";
import { saveBridgeSession, restoreBridgeSession } from "../../src/persistence/bridgeSave";

const key = "barbu.savedBridgeRun.v1";
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
async function openBridge(page: Page) {
  await page.getByRole("button", { name: "Open Bridge", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}
async function resume(page: Page, value: unknown) {
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
  await page.reload();
  await openBridge(page);
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
}
async function mockNative(page: Page) {
  await page.addInitScript(() => Object.assign(window, { isTauri: true, structuredClone: undefined, nativeCommands: [] as string[],
    __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } }
  }));
}

test("Bridge auctions and card play use TypeScript even inside the native shell", async ({ page }, info) => {
  await mockNative(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("barbu.practiceSeed", "8"));
  await openBridge(page);
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  expect((await saved(page)).fullHand.hands.map((hand: unknown[]) => hand.length)).toEqual([13, 13, 13, 13]);
  await page.reload();
  await openBridge(page);
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
  for (let turn = 0; turn < 40; turn++) {
    if (await page.getByRole("button", { name: "Start play", exact: true }).isVisible()) break;
    if (await page.getByRole("button", { name: "Deal again", exact: true }).isVisible()) {
      await page.getByRole("button", { name: "Deal again", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Use suggestion", exact: true }).click();
      await page.getByRole("button", { name: "Make call", exact: true }).click();
    }
  }
  await page.screenshot({ path: info.outputPath("bridge-auction.png"), fullPage: true });
  await page.getByRole("button", { name: "Start play", exact: true }).click();
  for (let turn = 0; turn < 3 && !(await saved(page)).fullHandReviewTrickCount; turn++) {
    await page.locator(".bridge-thumb-hand .hand-card.legal").first().click();
    await page.getByRole("button", { name: "Play card", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("bridge-review.png"), fullPage: true });
  const before = await saved(page);
  await page.reload();
  await openBridge(page);
  await page.getByRole("button", { name: "Continue Bridge", exact: true }).click();
  expect((await saved(page)).fullHand).toEqual(before.fullHand);
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  expect((await saved(page)).fullHandReviewTrickCount).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
  expect(errors).toEqual([]);
});

test("Bridge restores a legacy dummy turn and plays the same card", async ({ page }) => {
  await mockNative(page);
  const fixture = bridgeLegacyCases[2];
  await resume(page, fixture.saved);
  if (fixture.saved.fullHandReviewTrickCount) await page.getByRole("button", { name: "Next trick", exact: true }).click();
  const id = fixture.cardId;
  await page.locator(".bridge-thumb-hand").getByRole("button", { name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true }).click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  expect((await saved(page)).fullHand).toEqual(fixture.next);
});

test("Bridge replay preserves the deal, next board settles once, and practice cannot overwrite play", async ({ page }) => {
  let session = restoreBridgeSession(bridgeLegacyCases[0].saved);
  while (session.fullHand.status !== "complete") {
    session = transitionBridgeSession(session, { type: "next-trick" });
    const hand = session.fullHand;
    session = transitionBridgeSession(session, { type: "play-card",
      cardId: (hand.currentPlayerIndex === 2 ? hand.legalCardIds : hand.dummyLegalCardIds!)[0] });
  }
  const complete = saveBridgeSession(session, "legacy");
  await resume(page, complete);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  expect((await saved(page)).fullHand).toEqual(transitionBridgeSession(session, { type: "replay" }).fullHand);
  expect((await saved(page)).scores).toEqual(session.scores);
  await resume(page, complete);
  await page.getByRole("button", { name: "Next board", exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click();
  });
  expect((await saved(page)).scores).toEqual(bridgeSessionSettlement(session).scores);
  expect((await saved(page)).results).toHaveLength(1);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await page.getByLabel("Bridge practice drills").getByRole("button", { name: /Declarer play/ }).click();
  await expect(page.getByLabel("Your drill hand")).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test("Bridge survives invalid saves and blocked storage without freezing the auction", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, fullHand: {} })), key);
  await page.reload();
  await openBridge(page);
  await expect(page.getByRole("button", { name: "Continue Bridge", exact: true })).toHaveCount(0);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === key) throw Error("Storage full");
      original.call(this, name, value);
    };
  }, key);
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Make call", exact: true }).click();
  expect(errors).toEqual([]);
});
