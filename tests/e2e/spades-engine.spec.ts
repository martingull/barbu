import { expect, test, type Page } from "@playwright/test";
import native from "../fixtures/spades-native-hand.json" with { type: "json" };
import { createSpadesSession, transitionSpadesSession, spadesSessionSettlement } from "../../src/domain/spadesSession";
import { saveSpadesSession } from "../../src/persistence/spadesSave";

const key = "barbu.savedSpadesRun.v1";
async function openSpades(page: Page) {
  await page.getByRole("button", { name: "Open Spades", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}
async function mockNative(page: Page) {
  await page.addInitScript(() => Object.assign(window, { isTauri: true, structuredClone: undefined, nativeCommands: [] as string[],
    __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } }
  }));
}
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);

test("Spades bids, plays and resumes review without native commands", async ({ page }, info) => {
  await mockNative(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await openSpades(page);
  await page.getByRole("button", { name: "Play Spades", exact: true }).click();
  expect((await saved(page)).fullHand.hands.map((hand: unknown[]) => hand.length)).toEqual([13, 13, 13, 13]);
  const originalBids = (await saved(page)).bids;
  await page.getByRole("button", { name: "Adjust bid", exact: true }).click();
  await page.getByRole("button", { name: "Increase You bid", exact: true }).click();
  const bids = (await saved(page)).bids;
  expect(bids).toEqual({ ...originalBids, You: originalBids.You + 1 });
  await page.reload();
  await openSpades(page);
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  await expect(page.getByText("Set your bid for this hand", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show cards", exact: true }).click();
  await page.screenshot({ path: info.outputPath("spades-bidding-cards.png"), fullPage: true });
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  expect((await saved(page)).fullHand.spadesBids).toEqual(bids);
  await page.getByLabel("Your Spades hand").locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  await expect(page.getByLabel("Spades hand decision")).not.toContainText("odd tricks above six");
  await expect(page.getByLabel("Spades hand decision")).toContainText(/bid tricks|bid \d+ (reached|covered)/);
  await page.screenshot({ path: info.outputPath("spades-review.png"), fullPage: true });
  await page.reload();
  await openSpades(page);
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  await page.getByRole("button", { name: "Next trick", exact: true }).click();
  expect((await saved(page)).fullHandReviewTrickCount).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
  expect(errors).toEqual([]);
});

test("Spades continues native cards and replay preserves the deal", async ({ page }) => {
  await mockNative(page);
  const fixture = native[0];
  const session = { ...createSpadesSession(8), fullHand: fixture.initialHand, playStarted: true,
    bids: { Tutor: 3, Right: 3, You: 4, Left: 3 }, version: 1, usingBrowserFullHand: false, savedAt: "native" };
  await page.goto("/");
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key, session });
  await page.reload();
  await openSpades(page);
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  const id = fixture.choices[0];
  await page.getByLabel("Your Spades hand").getByRole("button", { name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true }).click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  expect((await saved(page)).fullHand.completedTricks[0].cards).toEqual(fixture.completedTricks[0].cards);
  const complete = { ...session, fullHand: { ...fixture.initialHand, status: "complete",
    hands: [[], [], [], []], currentTrick: [], completedTricks: fixture.completedTricks } };
  await page.evaluate(({ key, complete }) => localStorage.setItem(key, JSON.stringify(complete)), { key, complete });
  await page.reload();
  await openSpades(page);
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  const replay = (await saved(page)).fullHand;
  expect(replay.hands).toEqual(fixture.initialHand.hands);
  expect(replay.currentTrick).toEqual(fixture.initialHand.currentTrick);
});

test("Spades settles one hand on a double tap and practice preserves its save", async ({ page }) => {
  let session = transitionSpadesSession(createSpadesSession(8), { type: "start-play" });
  while (session.fullHand.status !== "complete") {
    session = transitionSpadesSession(session, { type: "next-trick" });
    session = transitionSpadesSession(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  }
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key, value: saveSpadesSession(session, "now") });
  await page.reload();
  await openSpades(page);
  await page.getByRole("button", { name: "Continue Spades", exact: true }).click();
  await page.getByRole("button", { name: "Next hand", exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click();
  });
  expect((await saved(page)).scores).toEqual(spadesSessionSettlement(session).scores);
  expect((await saved(page)).results).toHaveLength(1);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByRole("button", { name: "Table", exact: true }).first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /^Try cards: Follow suit/ }).click();
  await expect(page.getByLabel("Your drill hand")).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test("Spades survives malformed saves and failed storage writes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, fullHand: {} })), key);
  await page.reload();
  await openSpades(page);
  await expect(page.getByRole("button", { name: "Continue Spades", exact: true })).toHaveCount(0);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === key) throw Error("Storage full");
      original.call(this, name, value);
    };
  }, key);
  await page.getByRole("button", { name: "Play Spades", exact: true }).click();
  await expect(page.getByText("Progress could not be saved on this device.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start hand", exact: true }).click();
  await page.getByLabel("Your Spades hand").locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
