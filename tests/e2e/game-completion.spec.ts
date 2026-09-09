import { expect, test, type Page } from "@playwright/test";
import { startBrowserWhistHand, playBrowserWhistCard, startBrowserSpadesHand, playBrowserSpadesCard,
  startBrowserBridgeHand, applyBrowserBridgeAuction, playBrowserBridgeCard } from "../../src/browserHandFallback";
import { startBrowserDominoHand, playBrowserDominoCard, passBrowserDominoTurn } from "../../src/browserDominoFallback";
import { fullHandContracts } from "../../src/contractRegistry";
import type { FullHandState } from "../../src/lessonTypes";

type EndEvent = { game: string; scope: string; title: string; summary: string };
declare global { interface Window { gameEnds: EndEvent[] } }
const zero = () => ({ playerSide: 0, opponentSide: 0 });
const saveKey = (game: string) => `barbu.saved${game}Run.v1`;

async function resume(page: Page, game: string, saved: object, key = saveKey(game)) {
  await page.addInitScript(({ key, saved }) => {
    localStorage.setItem(key, JSON.stringify(saved));
    window.gameEnds = [];
    window.addEventListener("barbu:game-completed", event => window.gameEnds.push((event as CustomEvent).detail));
  }, { key, saved: { version: 1, results: [], usingBrowserFullHand: true,
    fullHandReviewTrickCount: 0, savedAt: new Date().toISOString(), ...saved } });
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${game}`, exact: true }).click();
  await page.getByRole("button", { name: game === "Barbu" ? "Continue Play Barbu" : `Continue ${game}`, exact: true }).click();
}

function finalDeal(game: "Whist" | "Spades", seed = 8) {
  let hand = game === "Whist" ? startBrowserWhistHand(seed) : startBrowserSpadesHand(seed);
  const play = game === "Whist" ? playBrowserWhistCard : playBrowserSpadesCard;
  for (let i = 0; i < 12; i++) hand = play(hand, hand.legalCardIds[0]);
  const complete = play(hand, hand.legalCardIds[0]);
  const playerTricks = complete.completedTricks.filter(trick => trick.winnerIndex % 2 === 0).length;
  return { hand, complete, playerTricks, opponentTricks: 13 - playerTricks };
}

async function finish(page: Page, game: string) {
  await expect.poll(() => page.evaluate(() => window.gameEnds)).toEqual([]);
  await page.getByLabel(`Your ${game} hand`).locator(".hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
}

async function expectEnd(page: Page, game: string, scope: string) {
  await expect(page.getByRole("status", { name: `${game} ${scope} complete`, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.gameEnds)).toEqual([
    { game, scope,
      title: await page.getByRole("status", { name: `${game} ${scope} complete`, exact: true }).getByRole("heading").innerText(),
      summary: await page.getByLabel(`${game} result summary`, { exact: true }).innerText() }
  ]);
  await page.setViewportSize(page.viewportSize()!);
  expect(await page.evaluate(() => window.gameEnds.length)).toBe(1);
}

for (const target of [4, 5, 6]) {
  test(`Whist settles a game at ${target} points`, async ({ page }, info) => {
    const oddTricks = target === 6 ? 2 : 1;
    let deal = finalDeal("Whist");
    for (let seed = 0; deal.playerTricks !== 6 + oddTricks && seed < 256; seed++) deal = finalDeal("Whist", seed);
    expect(deal.playerTricks).toBe(6 + oddTricks);
    await resume(page, "Whist", { fullHand: deal.hand, scores: { playerSide: target - oddTricks, opponentSide: 0 }, games: zero(), mode: "game" });
    await finish(page, "Whist");
    if (target < 5) {
      await expect(page.getByRole("button", { name: "Next hand", exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.gameEnds)).toEqual([]);
      return;
    }
    await expectEnd(page, "Whist", "game");
    await expect(page.getByRole("heading", { name: "Your partnership won the game", exact: true })).toBeVisible();
    await expect(page.getByLabel("Whist result summary")).toContainText(`Game score: ${target} - 0`);
    await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey("Whist"))).toBeNull();
    await page.screenshot({ path: info.outputPath(`whist-end-${target}.png`), fullPage: true });
    await page.getByRole("button", { name: "New match", exact: true }).click();
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).scores, saveKey("Whist"))).toEqual(zero());
  });
}

for (const gamesWon of [0, 1]) {
  test(`Whist rubber finishes only after two game wins, starting with ${gamesWon}`, async ({ page }) => {
    const deal = finalDeal("Whist");
    const playerWon = deal.playerTricks > 6;
    const odd = Math.max(deal.playerTricks, deal.opponentTricks) - 6;
    const side = playerWon ? "playerSide" : "opponentSide";
    await resume(page, "Whist", { fullHand: deal.complete, scores: { ...zero(), [side]: Math.max(0, 5 - odd) },
      games: { ...zero(), [side]: gamesWon }, mode: "rubber" });
    await expectEnd(page, "Whist", gamesWon === 1 ? "rubber" : "game");
    await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
    if (gamesWon === 0) {
      await page.getByRole("button", { name: "Next game", exact: true }).click();
      await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).scores, saveKey("Whist"))).toEqual(zero());
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).games, saveKey("Whist"))).toEqual({ ...zero(), [side]: 1 });
    } else {
      await expect(page.getByRole("heading", { name: `${playerWon ? "Your partnership" : "Opponents"} won the rubber`, exact: true })).toBeVisible();
      expect(await page.evaluate(key => localStorage.getItem(key), saveKey("Whist"))).toBeNull();
      await page.getByRole("button", { name: "New match", exact: true }).click();
      await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).games, saveKey("Whist"))).toEqual(zero());
    }
  });
}

const bids = { Tutor: 1, Right: 1, You: 1, Left: 1 };
function spadesSave(deal: ReturnType<typeof finalDeal>, player: number, opponent: number, fullHand = deal.hand) {
  const score = (tricks: number) => tricks >= 2 ? 20 + tricks - 2 : -20;
  return { fullHand, scores: { playerSide: player - score(deal.playerTricks), opponentSide: opponent - score(deal.opponentTricks) },
    bags: zero(), bids, playStarted: true, openingPanel: "table" };
}

for (const [player, opponent] of [[499, 400], [500, 400], [501, 400], [400, 500], [500, 510], [500, 500]]) {
  test(`Spades settles ${player}-${opponent} after all thirteen tricks`, async ({ page }, info) => {
    const deal = finalDeal("Spades");
    await resume(page, "Spades", spadesSave(deal, player, opponent));
    await finish(page, "Spades");
    await expect(page.getByLabel("Spades result summary")).toContainText(`${player} - ${opponent}`);
    if (Math.max(player, opponent) < 500 || player === opponent) {
      await expect(page.getByRole("button", { name: "Next hand", exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.gameEnds)).toEqual([]);
      if (player === opponent) await expect(page.getByRole("heading", { name: "Spades match tied: play on" })).toBeVisible();
      expect(await page.evaluate(key => localStorage.getItem(key), saveKey("Spades"))).not.toBeNull();
      return;
    }
    await expectEnd(page, "Spades", "match");
    await expect(page.getByRole("heading", { name: `${player > opponent ? "Your partnership" : "Opponents"} won the match`, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey("Spades"))).toBeNull();
    await page.screenshot({ path: info.outputPath(`spades-end-${player}-${opponent}.png`), fullPage: true });
    await page.getByRole("button", { name: "New match", exact: true }).click();
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).scores, saveKey("Spades"))).toEqual(zero());
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).bags, saveKey("Spades"))).toEqual(zero());
  });
}

test("Spades bag penalties are settled before the target check", async ({ page }) => {
  const deal = finalDeal("Spades");
  expect(deal.playerTricks).toBeGreaterThan(2);
  const saved = spadesSave(deal, 510, 400);
  saved.bags.playerSide = 9;
  await resume(page, "Spades", saved);
  await finish(page, "Spades");
  await expect(page.getByLabel("Spades result summary")).toContainText("100-point bag penalty");
  await expect(page.getByLabel("Spades result summary")).toContainText("410 - 400");
  await expect(page.getByRole("button", { name: "Next hand", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.gameEnds)).toEqual([]);
});

test("Spades completed save announces the match and clears resume", async ({ page }) => {
  const deal = finalDeal("Spades");
  await resume(page, "Spades", spadesSave(deal, 500, 400, deal.complete));
  await expectEnd(page, "Spades", "match");
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey("Spades"))).toBeNull();
});

for (const madeNil of [true, false]) {
  test(`Spades settles ${madeNil ? "successful" : "failed"} nil before announcing a winner`, async ({ page }) => {
    let deal = finalDeal("Spades");
    const nilMade = (hand: FullHandState) => !hand.completedTricks.some(trick => trick.winnerIndex === 2);
    for (let seed = 0; nilMade(deal.complete) !== madeNil && seed < 256; seed++) deal = finalDeal("Spades", seed);
    expect(nilMade(deal.complete)).toBe(madeNil);
    const regularScore = deal.playerTricks >= 1 ? 10 + deal.playerTricks - 1 : -10;
    const target = madeNil ? 500 : 400;
    await resume(page, "Spades", {
      ...spadesSave(deal, target, 300), bids: { ...bids, You: 0 },
      scores: { playerSide: target - regularScore - (madeNil ? 100 : -100), opponentSide: 0 }
    });
    await finish(page, "Spades");
    await expect(page.getByLabel("Spades partnership breakdown")).toContainText(`${target}`);
    if (madeNil) {
      await expectEnd(page, "Spades", "match");
    } else {
      await expect(page.getByLabel("Spades result summary")).toContainText("You missed nil (-100)");
      await expect(page.getByRole("button", { name: "Next hand", exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.gameEnds)).toEqual([]);
    }
  });
}

test("Bridge completes a board, not a score-target match", async ({ page }) => {
  let hand = applyBrowserBridgeAuction(startBrowserBridgeHand(8), {
    level: 1, strain: "NT", label: "1 No Trump", declarer: "You", dummy: "Tutor", target: 7,
    vulnerability: "None", declarerSide: "NS", openingLeader: "Left"
  }, []);
  let before: FullHandState = hand;
  for (let i = 0; i < 26 && hand.status !== "complete"; i++) {
    before = hand;
    hand = playBrowserBridgeCard(hand, (hand.currentPlayer === "Tutor" ? hand.dummyLegalCardIds! : hand.legalCardIds)[0]);
  }
  expect(hand.status).toBe("complete");
  await resume(page, "Bridge", { fullHand: before, view: "fullHand", scores: { ns: 1000, ew: -1000 }, auctionCalls: [] });
  await page.locator(".bridge-thumb-hand .hand-card.legal").first().click();
  await page.getByRole("button", { name: "Play card", exact: true }).click();
  await expectEnd(page, "Bridge", "board");
  await expect(page.getByRole("button", { name: "New match", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Next board", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bridge auction", exact: true })).toBeVisible();
});

test("Barbu ends after the seventh contract", async ({ page }) => {
  let hand = startBrowserDominoHand(8);
  let before = hand;
  for (let i = 0; i < 52 && hand.status !== "complete"; i++) {
    before = hand;
    hand = hand.legalCardIds.length ? playBrowserDominoCard(hand, hand.legalCardIds[0]) : passBrowserDominoTurn(hand);
  }
  expect(hand.status).toBe("complete");
  await resume(page, "Barbu", { view: "dominoHand", seed: 8, pendingContract: "Domino", dominoHand: before,
    usingBrowserDomino: true, results: fullHandContracts.slice(0, -1).map(contract => ({ contract,
      playerPenalty: 0, totalPenalty: 0, seatPenalties: { Tutor: 0, Right: 0, You: 0, Left: 0 } })) }, "barbu.savedPlayRun.v1");
  await page.getByRole("button", { name: before.legalCardIds.length ? "Place card" : "Pass", exact: true }).click();
  await expectEnd(page, "Barbu", "session");
  expect(await page.evaluate(() => localStorage.getItem("barbu.savedPlayRun.v1"))).toBeNull();
  await expect(page.getByRole("button", { name: "Next contract", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Hearts", exact: true })).toBeVisible();
});
