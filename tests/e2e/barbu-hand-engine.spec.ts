import { expect, test, type Page } from "@playwright/test";
import { nativeBarbuHands, nativeBarbuHand, compactBarbuHand } from "../fixtures/barbuHandFixture";
import type { FullHandState } from "../../src/lessonTypes";

const key = "barbu.savedPlayRun.v1";
async function openPlay(page: Page) {
  await page.getByRole("button", { name: "Open Barbu", exact: true }).click();
  await page.getByRole("tab", { name: "Play", exact: true }).click();
}
async function savedHand(page: Page): Promise<FullHandState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).fullHand, key);
}
async function runtime(page: Page, native: boolean) {
  await page.addInitScript(native => {
    Object.assign(window, { nativeCommands: [] as string[] });
    if (native) Object.assign(window, { isTauri: true, __TAURI_INTERNALS__: { invoke: async (command: string) => {
      (window as unknown as { nativeCommands: string[] }).nativeCommands.push(command);
      throw Error(`Unexpected native command: ${command}`);
    } } });
  }, native);
}

for (const native of [false, true]) {
  for (const fixture of nativeBarbuHands.filter(f => f.seed === 8)) {
    test(`Barbu ${fixture.contract} restores native save and replays in ${native ? "native" : "browser"} mode`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await runtime(page, native);
      await page.goto("/");
      await page.evaluate(({ key, fixture, hand }) => localStorage.setItem(key, JSON.stringify({
        version: 1, seed: fixture.seed, view: "fullHand", pendingContract: fixture.contract, results: [],
        fullHand: { ...hand, legalCardIds: ["stale"], cardsRemaining: 999 }, dominoHand: null,
        fullHandReviewTrickCount: 0, usingBrowserFullHand: false, usingBrowserDomino: false, savedAt: "native"
      })), { key, fixture, hand: nativeBarbuHand(fixture) });
      await page.reload();
      await openPlay(page);
      await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
      await expect(page.getByRole("heading", { name: `${fixture.contract} hand`, exact: true })).toBeVisible();
      expect(compactBarbuHand(await savedHand(page))).toEqual(fixture.initial);
      for (const [turn, id] of fixture.moves.entries()) {
        await page.getByLabel(`Your ${fixture.contract} hand`, { exact: true })
          .getByRole("button", { name: `${id.slice(0, -1)} ${id.at(-1)}`, exact: true }).click();
        await page.getByRole("button", { name: "Play card", exact: true }).click();
        expect((await savedHand(page)).completedTricks).toHaveLength(turn + 1);
        if (turn === 0) {
          await page.reload();
          await openPlay(page);
          await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
          await expect(page.getByRole("button", { name: "Next trick", exact: true })).toBeVisible();
          await expect(page.locator(".full-hand-card.legal")).toHaveCount(0);
          if (fixture.contract === "Hearts Trumps") await page.screenshot({ path: info.outputPath("barbu-restored-trump-review.png"), fullPage: true });
        }
        if (turn < 12) await page.getByRole("button", { name: "Next trick", exact: true }).click();
      }
      expect(compactBarbuHand(await savedHand(page))).toEqual(fixture.final);
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      expect(compactBarbuHand(await savedHand(page))).toEqual(fixture.initial);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
      expect(saved.results).toEqual([]);
      expect(saved.fullHandReviewTrickCount).toBe(0);
      expect(saved.usingBrowserFullHand).toBe(true);
      expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`Barbu new deal persists before any card in ${native ? "native" : "browser"} mode`, async ({ page }) => {
    await runtime(page, native);
    await page.goto("/");
    await openPlay(page);
    await page.getByRole("button", { name: "Play Barbu", exact: true }).click();
    await page.getByRole("button", { name: "Start hand", exact: true }).click();
    const initial = await savedHand(page);
    await page.reload();
    await openPlay(page);
    await page.getByRole("button", { name: "Continue Play Barbu", exact: true }).click();
    expect(await savedHand(page)).toEqual(initial);
    expect(await page.evaluate(() => (window as unknown as { nativeCommands: string[] }).nativeCommands)).toEqual([]);
  });
}
