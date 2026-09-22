import { expect, test, type Page } from "@playwright/test";
import { bridgeLegacyCases } from "../fixtures/bridgeLegacy";
import { createBridgeSession, transitionBridgeSession, bridgeSessionSettlement } from "../../src/domain/bridgeSession";
import { saveBridgeSession, restoreBridgeSession } from "../../src/persistence/bridgeSave";
import { trickTakingSeats } from "../../src/domain/trickTakingScore";
import { sortCardsForDisplay } from "../../src/cardOrdering";
import { formatCardLabel } from "../../src/cardDisplay";

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

test("Bridge keeps distinct visible hands and only the thumb hand is playable", async ({ page }, info) => {
  for (let declarer = 0; declarer < 4; declarer++) {
    const initial = createBridgeSession(12, declarer + 1);
    initial.auctionCalls = ["2S", "Pass", "Pass", "Pass"].map((call, i) => ({ seat: trickTakingSeats[(declarer + i) % 4], call }));
    const session = transitionBridgeSession(initial, { type: "start-play" });
    await resume(page, saveBridgeSession(session, "layout"));
    if (declarer === 1) {
      // South's opening lead exposes West's dummy without exposing either defender.
      await page.locator(".bridge-thumb-hand .legal").first().dblclick();
    }
    let sawDummy = false;
    let sawDeclarer = false;
    let tableBox: { y: number; height: number } | null = null;
    for (let turn = 0; turn < (declarer === 2 ? 8 : 1); turn++) {
      if (await page.getByRole("button", { name: "Next trick", exact: true }).isVisible()) {
        await page.getByRole("button", { name: "Next trick", exact: true }).click();
      }
      const { fullHand: hand } = await saved(page);
      const dummyTurn = declarer % 2 === 0 && hand.currentPlayer === hand.bridgeContract.dummy;
      const active = dummyTurn ? hand.dummyHand : hand.playerHand;
      const reference = declarer === 0 ? [] : dummyTurn ? hand.playerHand : hand.dummyHand;
      expect(await page.locator(".bridge-thumb-hand button").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label")))).toEqual(
        sortCardsForDisplay(active).map(card => `${card.rank} ${card.suit}`));
      expect(await page.locator(".bridge-table-hand img").evaluateAll(nodes => nodes.map(node => node.getAttribute("alt")))).toEqual(
        sortCardsForDisplay(reference ?? []).map(formatCardLabel));
      await expect(page.locator(".bridge-seat-north button, .bridge-seat-north .legal, .bridge-seat-north .illegal, .bridge-seat-north .selected")).toHaveCount(0);
      await expect(page.locator(".bridge-active-hand-label")).toHaveText(declarer === 0 ? "South · Dummy" : declarer === 2 ? dummyTurn ? "North · Dummy" : "South · Declarer" : "South · Defender");
      if (declarer === 2) {
        await expect(page.locator(".bridge-seat-label")).toHaveText(dummyTurn ? "South Declarer" : "North Dummy");
        sawDummy ||= dummyTurn;
        sawDeclarer ||= !dummyTurn;
        const box = await page.locator(".bridge-table").boundingBox();
        expect(box).not.toBeNull();
        if (tableBox) {
          expect(Math.abs(box!.y - tableBox.y)).toBeLessThanOrEqual(1);
          expect(Math.abs(box!.height - tableBox.height)).toBeLessThanOrEqual(1);
        }
        tableBox = box;
        if (turn < 2) await page.screenshot({ path: info.outputPath(`bridge-active-${dummyTurn ? "dummy" : "declarer"}.png`), fullPage: true });
        await page.locator(".bridge-thumb-hand .legal").first().click();
        await expect(page.locator(".bridge-thumb-hand [aria-pressed=true]")).toHaveCount(1);
        await page.getByRole("button", { name: "Play card", exact: true }).click();
      }
    }
    if (declarer === 2) expect(sawDummy && sawDeclarer).toBe(true);
  }
});

test("Bridge auction fits narrow and desktop widths without horizontal scrolling", async ({ page }, info) => {
  await page.goto("/");
  await openBridge(page);
  await page.getByRole("button", { name: "Play Bridge", exact: true }).click();
  for (const width of [320, 360, 393, 1365]) {
    await page.setViewportSize({ width, height: 740 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator(".bridge-auction-hand .hand-card").evaluateAll(nodes => nodes.every(node => {
      const box = node.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }))).toBe(true);
    await page.screenshot({ path: info.outputPath(`bridge-auction-${width}.png`), fullPage: true });
  }
});

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
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Try cards: Declarer play/ }).click();
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
