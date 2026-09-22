import { expect, test, type Page } from "@playwright/test";
import { dominoHandEngine as engine } from "../../src/domain/dominoHand";
import { normalizeDominoHand } from "../../src/persistence/dominoSave";
import { dominoFixtures as fixtures, inflateDominoHand, compactDominoHand } from "../fixtures/dominoHandFixture";
import type { DominoHandState } from "../../src/lessonTypes";

const key = "barbu.savedPlayRun.v1";
async function openPlay(page: Page) {
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}
async function resume(page: Page) {
  await openPlay(page);
  await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Domino hand", exact: true })).toBeVisible();
}
async function savedHand(page: Page): Promise<DominoHandState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).dominoHand, key);
}
async function expectClearLayout(page: Page) {
  const regions = [page.getByLabel("Domino layout", { exact: true }),
    page.locator(".domino-play-surface .table-play-panel .result"),
    page.locator(".domino-play-surface .table-play-panel .explanation"),
    page.getByLabel("Your Domino hand", { exact: true }),
    page.locator(".domino-play-surface .action-row")];
  let bottom = 0;
  for (const region of regions) {
    const box = await region.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(bottom + 7.5);
    bottom = box!.y + box!.height;
  }
}
async function runtime(page: Page, native: boolean) {
  await page.addInitScript(native => {
    Object.assign(window, { nativeCommands: [] as string[] });
    if (native) Object.assign(window, { isTauri: true, structuredClone: undefined, __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } } });
  }, native);
}

for (const native of [false, true]) {
  for (const origin of ["native", "browser"] as const) {
    test(`Domino restores ${origin} saves and replays in ${native ? "native" : "browser"} runtime`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await runtime(page, native);
      const fixture = fixtures[origin].find(f => f.seed === 8)!;
      const legacy = inflateDominoHand(fixture, "mid");
      let hand = normalizeDominoHand(legacy)!;
      await page.goto("/");
      await page.evaluate(({ key, hand, browser }) => localStorage.setItem(key, JSON.stringify({
        version: 1, seed: 8, view: "dominoHand", pendingContract: "Domino", results: [], fullHand: null,
        dominoHand: { ...hand, legalCardIds: ["stale"], scores: [999], cardsRemaining: 999 },
        fullHandReviewTrickCount: 0, usingBrowserFullHand: false, usingBrowserDomino: browser, savedAt: "legacy"
      })), { key, hand: legacy, browser: origin === "browser" });
      await page.reload();
      await resume(page);
      expect(compactDominoHand(await savedHand(page))).toEqual(compactDominoHand(hand));
      for (let turn = 0; turn < 100 && hand.status !== "complete"; turn++) {
        await expectClearLayout(page);
        if (turn === 0) {
          await page.screenshot({ path: info.outputPath("domino-restored-hand.png"), fullPage: true });
        }
        const cardId = hand.legalCardIds[0];
        if (cardId) {
          await expect(page.getByRole("button", { name: "Pass", exact: true })).toBeDisabled();
          await page.getByLabel("Your Domino hand", { exact: true }).getByRole("button", { name: `${cardId.slice(0, -1)} ${cardId.at(-1)}`, exact: true }).click();
          await page.getByRole("button", { name: "Place card", exact: true }).click();
        } else {
          await expect(page.getByRole("button", { name: "Place card", exact: true })).toBeDisabled();
          await page.getByRole("button", { name: "Pass", exact: true }).click();
        }
        hand = engine.transition(hand, cardId ? { type: "play-card", cardId } : { type: "pass" });
        expect(compactDominoHand(await savedHand(page))).toEqual(compactDominoHand(hand));
        if (turn === 0) { await page.reload(); await resume(page); }
      }
      expect(hand.status).toBe("complete");
      await expect(page.getByLabel("Domino result details")).toContainText(String(hand.scores[2]));
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      const replay = await savedHand(page);
      expect(compactDominoHand(replay)).toEqual(compactDominoHand(engine.transition(hand, { type: "replay" })));
      expect(replay.initialHands).toEqual(hand.initialHands);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
      expect(saved.results).toEqual([]);
      expect(saved.usingBrowserDomino).toBe(true);
      const viewport = page.viewportSize()!;
      for (const size of [{ width: 320, height: 568 }, { width: 1024, height: 768 }, viewport]) {
        await page.setViewportSize(size);
        await expectClearLayout(page);
      }
      expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`Domino practice starts and plays without commands in ${native ? "native" : "browser"} runtime`, async ({ page }) => {
    await runtime(page, native);
    await page.goto("/");
    await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.getByRole("button", { name: /^Try cards: Domino\b/ }).click();
    await expect(page.getByRole("heading", { name: "Domino hand", exact: true })).toBeVisible();
    const legal = page.locator(".domino-cards .full-hand-card.legal");
    if (await legal.count()) {
      await legal.first().click();
      await page.getByRole("button", { name: "Place card", exact: true }).click();
    } else await page.getByRole("button", { name: "Pass", exact: true }).click();
    expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  });
}
