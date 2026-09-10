import { test, expect } from "@playwright/test";
import fixtures from "../fixtures/bridge-bidding.json" with { type: "json" };
import { suggestBridgeCall, explainBridgeCall, parseBridgeBid } from "../../src/bridgeBidding";
import { bridgeBoardConditions } from "../../src/bridgeBoard";
import { bridgeDeclarerDrillPool, bridgeDefenseDrillPool } from "../../src/bridgePractice";
import { startBrowserBridgeHand, chooseBrowserOpponentCardForState, applyBrowserBridgeAuction, playBrowserBridgeCard } from "../../src/browserHandFallback";
import type { BridgeAuctionCall, Card, FullHandState, Seat, Suit } from "../../src/lessonTypes";

const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
const card = (id: string): Card => ({ id, rank: id.slice(0, -1), suit: id.at(-1) as Suit, label: id });
const cards = (ids: string) => ids.split(" ").map(card);
const order = (call: string) => { const bid = parseBridgeBid(call); return bid ? (bid.level - 1) * 5 + ["C", "D", "H", "S", "NT"].indexOf(bid.strain) : -1; };
function legalCalls(calls: BridgeAuctionCall[], player: Seat) {
  const lastAction = calls.findLastIndex(call => call.call !== "Pass");
  if ((lastAction < 0 && calls.length >= 4) || (lastAction >= 0 && calls.length - lastAction > 3)) return [];
  const lastBid = calls.findLastIndex(call => parseBridgeBid(call.call));
  const modifier = calls.slice(lastBid + 1).find(call => ["Double", "Redouble"].includes(call.call));
  const bids = Array.from({ length: 35 }, (_, index) => `${Math.floor(index / 5) + 1}${["C", "D", "H", "S", "NT"][index % 5]}`);
  const opponentBid = lastBid >= 0 && seats.indexOf(calls[lastBid].seat) % 2 !== seats.indexOf(player) % 2;
  return ["Pass", ...(opponentBid && !modifier ? ["Double"] : []), ...(!opponentBid && modifier?.call === "Double" ? ["Redouble"] : []), ...bids.filter(bid => order(bid) > (lastBid >= 0 ? order(calls[lastBid].call) : -1))];
}

test("Bridge bidding shares native decisions at every seat", () => {
  for (const fixture of fixtures.cases) for (let rotation = 0; rotation < 4; rotation++) {
    const dealer = (fixture.dealer + rotation) % 4;
    const calls = fixture.calls.map((call, index) => ({ seat: seats[(dealer + index) % 4], call }));
    const player = seats[(dealer + calls.length) % 4];
    const hand = cards(fixtures.hands[fixture.hand]);
    for (let ordering = 0; ordering < 2; ordering++) {
      expect(suggestBridgeCall(hand, player, calls, legalCalls(calls, player)), fixture.name).toBe(fixture.expected);
      hand.reverse();
    }
  }
});

test("Bridge explanations distinguish openings responses and rebids", () => {
  expect(explainBridgeCall("2NT", [], "You")).toContain("20-21");
  const calls = [{ seat: "Tutor" as Seat, call: "1NT" }, { seat: "Right" as Seat, call: "Pass" }];
  expect(explainBridgeCall("2NT", calls, "You")).toContain("8-9");
  expect(explainBridgeCall("3NT", calls, "You")).not.toContain("Preemptive");
  expect(explainBridgeCall("2S", [{ seat: "Tutor", call: "1S" }], "You")).toContain("6-9");
  expect(explainBridgeCall("2D", [{ seat: "Tutor", call: "2C" }], "You")).toContain("waiting");
});

test("Bridge boards follow the sixteen board schedule independently of seed", () => {
  const cycle = ["None", "NS", "EW", "Both", "NS", "EW", "Both", "None", "EW", "Both", "None", "NS", "Both", "None", "NS", "EW"];
  for (let board = 1; board <= 32; board++) for (const seed of [0, 7, 42]) {
    const hand = startBrowserBridgeHand(seed, board);
    expect(hand.bridgeBoardNumber).toBe(board);
    expect(hand.bridgeDealer).toBe(seats[(board - 1) % 4]);
    expect(hand.bridgeVulnerability).toBe(cycle[(board - 1) % 16]);
    expect(hand.hands.map(hand => hand.length)).toEqual([13, 13, 13, 13]);
  }
  for (const invalid of [0, -1, NaN, 1.5]) expect(() => bridgeBoardConditions(invalid)).toThrow();
});

test("Bridge practice legality and seat order are independent of tactical grading", () => {
  expect(bridgeDeclarerDrillPool).toHaveLength(3);
  expect(bridgeDefenseDrillPool).toHaveLength(3);
  for (const { trick } of [...bridgeDeclarerDrillPool, ...bridgeDefenseDrillPool]) {
    const suit = trick.tableBeforeChoice[0]?.card.suit;
    const following = trick.hand.filter(card => card.suit === suit);
    expect([...trick.legalCardIds].sort()).toEqual((following.length ? following : trick.hand).map(card => card.id).sort());
    const plays = [...trick.tableBeforeChoice, { seat: "You", card: trick.hand.find(card => trick.legalCardIds.includes(card.id))! }, ...trick.tableAfterChoice];
    expect(new Set(plays.map(play => play.seat)).size).toBe(4);
    expect(new Set([...trick.hand, ...trick.tableBeforeChoice.map(play => play.card), ...trick.tableAfterChoice.map(play => play.card)].map(card => card.id)).size).toBe(trick.hand.length + 3);
    plays.forEach((play, i) => expect(play.seat).toBe(seats[(seats.indexOf(plays[0].seat as Seat) + i) % 4]));
    expect(Object.entries(trick.cardOutcomes).filter(([, outcome]) => outcome === "good").every(([id]) => trick.legalCardIds.includes(id))).toBe(true);
  }
});

function position(hand: string, trick: [number, string][], declarer = 1, trump: Suit | null = null): FullHandState {
  const state = startBrowserBridgeHand(5);
  state.hands = [[], cards(hand), [], []];
  return { ...state, currentPlayerIndex: 1, currentPlayer: "Right", currentTrick: trick.map(([seat, id]) => ({ seat: seats[seat], card: card(id) })), trumpSuit: trump,
    bridgeContract: { level: 1, strain: trump ?? "NT", label: "1NT", declarer: seats[declarer], dummy: seats[(declarer + 2) % 4], target: 7, vulnerability: "None" } };
}

test("Bridge cardplay preserves winners and uses sequence or fourth best leads", () => {
  expect(chooseBrowserOpponentCardForState(position("AC QC 2C", [[3, "3C"], [0, "5C"]]))?.id).toBe("QC");
  expect(chooseBrowserOpponentCardForState(position("AC QC 2C", [[3, "3C"], [0, "KC"]]))?.id).toBe("AC");
  expect(chooseBrowserOpponentCardForState(position("AC 2C", [[2, "3C"], [3, "KC"], [0, "4C"]]))?.id).toBe("2C");
  expect(chooseBrowserOpponentCardForState(position("AC KC QC 7C 2C 3H", [], 2))?.id).toBe("AC");
  expect(chooseBrowserOpponentCardForState(position("KS JS 8S 4S 2S 3H", [], 2))?.id).toBe("4S");
  expect(chooseBrowserOpponentCardForState(position("AC KC 7C 2C 3H", [], 2, "S"))?.id).toBe("AC");
  expect(chooseBrowserOpponentCardForState(position("AS 2D", [[2, "3C"], [3, "KC"], [0, "4C"]], 1, "S"))?.id).toBe("2D");
});

test("Bridge policy ignores hidden defender hands", () => {
  const state = position("KS JS 8S 4S 2S 3H", [[2, "3S"]], 2);
  state.hands[0] = cards("AS QS 9S"); // exposed dummy
  const expected = chooseBrowserOpponentCardForState(state)?.id;
  state.hands[2] = cards("AC KC QC");
  state.hands[3] = cards("AH KH QH");
  expect(chooseBrowserOpponentCardForState(state)?.id).toBe(expected);
});

test("Bridge complete deals remain legal and conserve all fifty two cards", () => {
  for (let seed = 0; seed < 64; seed++) {
    const initial = startBrowserBridgeHand(seed, seed + 1);
    const remaining = initial.hands.map(hand => [...hand]);
    const declarer = seed % 4;
    const trump = ["C", "D", "H", "S", "NT"][seed % 5] as Suit | "NT";
    let state = applyBrowserBridgeAuction(initial, { level: 1, strain: trump, label: `1${trump}`, declarer: seats[declarer], dummy: seats[(declarer + 2) % 4], target: 7, vulnerability: initial.bridgeVulnerability! }, []);
    let decisions = 0;
    while (state.status !== "complete") {
      const legal = state.currentPlayerIndex === 2 ? state.legalCardIds : state.dummyLegalCardIds ?? [];
      expect(legal.length, `seed ${seed}, trick ${state.trickNumber}, seat ${state.currentPlayer}`).toBeGreaterThan(0);
      state = playBrowserBridgeCard(state, legal[0]);
      expect(++decisions).toBeLessThanOrEqual(26);
    }
    expect(state.completedTricks).toHaveLength(13);
    const seen = new Set<string>();
    for (const trick of state.completedTricks) for (const play of trick.cards) {
      const index = seats.indexOf(play.seat);
      const held = remaining[index];
      const following = held.filter(card => card.suit === trick.cards[0].card.suit);
      expect((following.length ? following : held).some(card => card.id === play.card.id)).toBe(true);
      expect(seen.has(play.card.id)).toBe(false);
      seen.add(play.card.id);
      remaining[index] = held.filter(card => card.id !== play.card.id);
    }
    expect(seen.size).toBe(52);
    expect(state.hands.flat()).toHaveLength(0);
  }
});
