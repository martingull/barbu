import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { typescriptHandEngine } from "../../src/domain/handEngine";
import { dominoHandEngine } from "../../src/domain/dominoHand";
import { createBarbuSession, transitionBarbuSession, barbuSessionComplete, barbuSeatTotals } from "../../src/domain/barbuSession";
import { formatSignedScore } from "../../src/presentation/scorePresentation";
import { saveBarbuSession, barbuSaveKey } from "../../src/persistence/barbuSave";
import { applyBrowserBridgeAuction } from "../../src/domain/trickTakingHand";
import { createGinSession, transitionGinSession, ginComplete } from "../../src/domain/ginRummySession";
import { chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { saveGinSession, ginSaveKey } from "../../src/persistence/ginRummySave";
import type { FullHandContract } from "../../src/domain/types";

const zero = () => ({ playerSide: 0, opponentSide: 0 });
function completedHand(contract: FullHandContract) {
  const engine = typescriptHandEngine(contract)!;
  let hand = engine.start({ seed: 8, boardNumber: 3 });
  if (contract === "Bridge") hand = applyBrowserBridgeAuction(hand, {
    level: 1, strain: "NT", label: "1 No Trump", declarer: "You", dummy: "Tutor", target: 7,
    vulnerability: "EW", declarerSide: "NS", dealer: "You", openingLeader: "Left"
  }, [{ seat: "You", call: "1NT" }, { seat: "Left", call: "Pass" },
    { seat: "Tutor", call: "Pass" }, { seat: "Right", call: "Pass" }]);
  for (let turn = 0; hand.status !== "complete" && turn < 30; turn++) {
    const cards = contract === "Bridge" && hand.currentPlayer === "Tutor" ? hand.dummyLegalCardIds! : hand.legalCardIds;
    hand = engine.transition(hand, { type: "play-card", cardId: cards[0] });
  }
  expect(hand.status).toBe("complete");
  return hand;
}

async function resume(page: Page, game: string, value: object, key = `barbu.saved${game}Run.v1`) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key, value: { version: 1, results: [], usingBrowserFullHand: true,
      fullHandReviewTrickCount: 0, savedAt: new Date().toISOString(), ...value }
  });
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("button", { name: game === "Barbu" ? "Continue Play Barbu" : `Continue ${game}`, exact: true }).click();
}

async function auditResult(page: Page, info: TestInfo, lastContent: string, next: string) {
  const result = page.locator(".table-play-surface.compact-result");
  await expect(result).toBeVisible();
  await page.screenshot({ path: info.outputPath("result-top.png"), scale: "css" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const finalRow = result.locator(lastContent).last();
  await finalRow.scrollIntoViewIfNeeded();
  await page.locator(".app-shell").evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(finalRow).toBeInViewport({ ratio: 1 });
  const actions = result.locator(".action-row");
  const actionBox = (await actions.boundingBox())!;
  const rowBox = (await finalRow.boundingBox())!;
  expect(rowBox.y + rowBox.height, "Last score row must not sit behind the buttons").toBeLessThanOrEqual(actionBox.y + 1);
  expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  for (const button of await actions.getByRole("button").all()) await expect(button).toBeInViewport({ ratio: 1 });
  const overflow = await result.locator(".hearts-hand-breakdown-row > *, .run-scorecard-row > *, .run-final-summary span, .run-final-summary strong, .bridge-result-details dt, .bridge-result-details dd, .action-row button").evaluateAll(cells =>
    cells.filter(cell => cell.scrollWidth > cell.clientWidth + 1).map(cell => cell.textContent));
  expect(overflow, "Score labels and actions must fit their columns").toEqual([]);
  await page.screenshot({ path: info.outputPath("result-bottom.png"), scale: "css" });
  await actions.getByRole("button", { name: next, exact: true }).click();
  await expect(result).toHaveCount(0);
}

const viewports = [{ width: 320, height: 568 }, { width: 360, height: 740 },
  { width: 414, height: 736 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }];

for (const viewport of viewports) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize(viewport); });

    for (const mode of ["hand", "game", "rubber"] as const) test(`Whist ${mode} result`, async ({ page }, info) => {
      await resume(page, "Whist", { fullHand: completedHand("Whist"),
        mode: mode === "rubber" ? "rubber" : "game", scores: mode === "hand" ? zero() : { playerSide: 4, opponentSide: 4 },
        games: mode === "rubber" ? { playerSide: 1, opponentSide: 1 } : zero() });
      await auditResult(page, info, ".hearts-hand-breakdown-row", mode === "hand" ? "Next hand" : "New match");
    });

    for (const mode of ["hand", "match"] as const) test(`Spades ${mode} result`, async ({ page }, info) => {
      await resume(page, "Spades", { fullHand: completedHand("Spades"), playStarted: true, openingPanel: "table",
        bids: { Tutor: 1, Right: 1, You: 0, Left: 1 }, bags: { playerSide: 9, opponentSide: 9 },
        scores: mode === "hand" ? zero() : { playerSide: 900, opponentSide: 400 } });
      await auditResult(page, info, ".hearts-hand-breakdown-row", mode === "hand" ? "Next hand" : "New match");
    });

    test("Bridge board result", async ({ page }, info) => {
      const fullHand = completedHand("Bridge");
      await resume(page, "Bridge", { fullHand, view: "fullHand", scores: { ns: 1000, ew: -1000 }, auctionCalls: fullHand.bridgeAuction });
      await expect(page.getByLabel("Bridge board settlement")).toContainText("NS this board-100");
      await auditResult(page, info, ".bridge-result-details > div", "Next board");
      await expect(page.getByRole("heading", { name: "Bridge auction", exact: true })).toBeVisible();
    });

    test("Barbu contract result", async ({ page }, info) => {
      await resume(page, "Barbu", { seed: 8, view: "fullHand", pendingContract: "No Hearts", fullHand: completedHand("No Hearts") }, barbuSaveKey);
      await auditResult(page, info, ".full-hand-result-tricks", "Next contract");
    });

    test("Barbu session result", async ({ page }, info) => {
      let session = createBarbuSession(8), before = session;
      for (let turn = 0; !barbuSessionComplete(session) && turn < 300; turn++) {
        before = session;
        const hand = session.fullHand ?? session.dominoHand;
        session = transitionBarbuSession(session, session.view === "runContractIntro" ? { type: "start-hand" }
          : hand!.status === "complete" ? { type: "next-contract" }
          : session.fullHandReviewTrickCount ? { type: "next-trick" }
          : hand!.legalCardIds.length ? { type: "play-card", cardId: hand!.legalCardIds[0] } : { type: "pass" });
      }
      expect(barbuSessionComplete(session)).toBe(true);
      await resume(page, "Barbu", saveBarbuSession(before, new Date().toISOString())!, barbuSaveKey);
      await expect(page.getByLabel("Table scores").locator("strong").first()).toHaveText(formatSignedScore(barbuSeatTotals(before.results).You));
      await page.getByRole("button", { name: before.dominoHand!.legalCardIds.length ? "Place card" : "Pass", exact: true }).click();
      const totals = barbuSeatTotals(session.results);
      await expect(page.locator(".contract-status strong")).toHaveText(`${formatSignedScore(totals.You)} points`);
      await expect(page.getByLabel("Barbu final totals").locator("strong")).toHaveText([totals.You, totals.Tutor, totals.Left, totals.Right].map(formatSignedScore));
      await auditResult(page, info, ".run-scorecard-row.total", "New game");
    });

    test("Domino contract result", async ({ page }, info) => {
      let hand = dominoHandEngine.start({ seed: 8 });
      for (let turn = 0; hand.status !== "complete" && turn < 52; turn++) {
        hand = dominoHandEngine.transition(hand, hand.legalCardIds.length
          ? { type: "play-card", cardId: hand.legalCardIds[0] } : { type: "pass" });
      }
      expect(hand.status).toBe("complete");
      await resume(page, "Barbu", { seed: 8, view: "dominoHand", pendingContract: "Domino", dominoHand: hand }, barbuSaveKey);
      await auditResult(page, info, ".domino-result-grid", "Next contract");
    });

    test("Counting warm-up result", async ({ page }, info) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await page.getByRole("button", { name: /Count trumps/ }).click();
      for (let segment = 0; segment < 3; segment++) {
        while (await page.getByRole("button", { name: "Next trick", exact: true }).count()) {
          await page.getByRole("button", { name: "Next trick", exact: true }).click();
        }
        await page.getByRole("button", { name: "Answer memory", exact: true }).click();
        await page.locator(".memory-options button").first().click();
        await page.getByRole("button", { name: "Check memory", exact: true }).click();
        await page.getByRole("button", { name: segment === 2 ? "Review round" : "Continue", exact: true }).click();
      }
      await auditResult(page, info, ".memory-result dl", "Next hand");
    });

    for (const mode of ["hand", "game"] as const) test(`Gin ${mode} result`, async ({ page }, info) => {
      let session = createGinSession(1), turn = 0;
      while ((mode === "game" ? !ginComplete(session) : session.hand.phase !== "complete") && turn++ < 2000) {
        session = transitionGinSession(session, session.hand.phase === "complete"
          ? { type: "next", seed: turn } : chooseGinAction(ginObservation(session)));
      }
      expect(session.hand.phase).toBe("complete");
      await resume(page, "Gin Rummy", saveGinSession(session, new Date().toISOString()), ginSaveKey);
      await auditResult(page, info, ".meld-review p", mode === "game" ? "New game" : "Next hand");
    });

    test("Card Counting hand result", async ({ page }, info) => {
      test.setTimeout(60_000);
      await page.goto("/");
      await page.getByRole("button", { name: "Open Card Counting I", exact: true }).click();
      await page.getByRole("button", { name: /Whist memory hand/ }).click();
      for (let trick = 0; trick < 13; trick++) {
        await page.locator(".full-hand-card.legal").first().click();
        await page.getByRole("button", { name: "Play card", exact: true }).click();
        if (await page.getByRole("button", { name: "Check memory", exact: true }).count()) {
          await page.locator(".memory-options button").first().click();
          await page.getByRole("button", { name: "Check memory", exact: true }).click();
        }
        if (trick < 12) await page.getByRole("button", { name: "Next trick", exact: true }).click();
      }
      await auditResult(page, info, ".memory-result dl", "Next hand");
    });
  });
}
