import { test, expect } from "@playwright/test";
import cases from "../fixtures/spades-nil-policy.json" with { type: "json" };
import { hydrateFullHandState, startSpadesBiddingHand, playBrowserSpadesCard, chooseBrowserOpponentCardForState } from "../../src/domain/trickTakingHand";
import type { Card, FullHandState, Seat, Suit } from "../../src/lessonTypes";

import { beginSpadesHand } from "../../src/domain/trickTakingHand";
import { suggestedSpadesBidsForHand } from "../../src/domain/spadesBidding";
import { spadesScoreForSide, spadesMatchComplete } from "../../src/spadesScoring";

const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Suit });

test("Spades nil decisions match native fixtures at every seat", () => {
  for (const fixture of cases) for (let rotation = 0; rotation < 4; rotation++) {
    const player = (fixture.player + rotation) % 4;
    const bids = [0, 0, 0, 0];
    fixture.bids.forEach((bid, seat) => { bids[(seat + rotation) % 4] = bid; });
    const hands: Card[][] = [[], [], [], []];
    hands[player] = fixture.hand.map(card);
    const state: FullHandState = {
      id: `spades-hand-fixture-bids-${bids.join(".")}-S`, contract: "Spades", hands,
      currentPlayerIndex: player, currentPlayer: seats[player],
      currentTrick: fixture.trick.map(play => ({
        seat: seats[(Number(play[0]) + rotation) % 4], card: card(String(play[1]))
      })),
      completedTricks: [], playerHand: hands[2], legalCardIds: [],
      playerPenalty: 0, totalPenalty: 0, cardsRemaining: fixture.hand.length + fixture.trick.length,
      trickNumber: 1, status: "in_progress", prompt: "", trumpSuit: "S"
    };
    for (let order = 0; order < 2; order++) {
      const chosen = chooseBrowserOpponentCardForState(state);
      expect(chosen?.id, `${fixture.name}, rotation ${rotation}`).toBe(fixture.expected);
      expect(hands[player].some(held => held.id === chosen?.id)).toBe(true);
      const following = hands[player].filter(held => held.suit === state.currentTrick[0].card.suit);
      if (following.length) expect(following.some(held => held.id === chosen?.id)).toBe(true);
      hands[player].reverse();
    }
  }
});

test("Spades keeps follow-suit and breaking exceptions", () => {
  for (const fixture of [
    { hand: ["2S", "AS", "3C"], led: [], history: [], legal: ["3C"] },
    { hand: ["2S", "AS"], led: [], history: [], legal: ["2S", "AS"] },
    { hand: ["2S", "AS", "3C"], led: ["KC"], history: [], legal: ["3C"] },
    { hand: ["2S", "AS", "3D"], led: ["KC"], history: [], legal: ["2S", "AS", "3D"] },
    { hand: ["2S", "AS", "3C"], led: [], history: ["4C", "5C", "3S", "6C"], legal: ["2S", "AS", "3C"] }
  ]) {
    const state = hydrateFullHandState({ ...startSpadesBiddingHand(8),
      hands: [[], [], fixture.hand.map(card), []], currentPlayerIndex: 2,
      currentTrick: fixture.led.map(id => ({ seat: "Right", card: card(id) })),
      completedTricks: fixture.history.length ? [{ cards: fixture.history.map((id, index) => ({ seat: seats[index], card: card(id) })),
        winner: "You", winnerIndex: 2, penalty: 1, outcome: "captured_penalty" }] : []
    });
    expect(state.legalCardIds).toEqual(fixture.legal);
    for (const id of fixture.hand.filter(id => !fixture.legal.includes(id))) expect(playBrowserSpadesCard(state, id)).toBe(state);
  }
});

test("locked bids make opponent choices independent of concealed hands", () => {
  for (let seed = 0; seed < 64; seed++) {
    const initial = startSpadesBiddingHand(seed);
    let hand = beginSpadesHand(initial, suggestedSpadesBidsForHand(initial));
    while (hand.status !== "complete") {
      const chosen = chooseBrowserOpponentCardForState(hand)!;
      const hidden = { ...hand, hands: hand.hands.map((cards, index) => index === hand.currentPlayerIndex ? cards : []) };
      expect(chooseBrowserOpponentCardForState(hidden)?.id).toBe(chosen.id);
      hand = playBrowserSpadesCard(hand, chosen.id);
    }
  }
});

test("Spades settles contracts, nil, bags and tied targets using the existing partnership rules", () => {
  const side: Seat[] = ["You", "Tutor"];
  for (const fixture of [
    { bid: 4, partnerBid: 3, tricks: 4, partnerTricks: 3, bags: 0, score: 70, delta: 0, penalty: 0 },
    { bid: 4, partnerBid: 3, tricks: 3, partnerTricks: 3, bags: 0, score: -70, delta: 0, penalty: 0 },
    { bid: 4, partnerBid: 3, tricks: 5, partnerTricks: 3, bags: 9, score: -29, delta: -9, penalty: 100 },
    { bid: 0, partnerBid: 3, tricks: 0, partnerTricks: 3, bags: 0, score: 130, delta: 0, penalty: 0 },
    { bid: 0, partnerBid: 3, tricks: 1, partnerTricks: 2, bags: 0, score: -70, delta: 0, penalty: 0 },
    { bid: 0, partnerBid: 0, tricks: 1, partnerTricks: 0, bags: 0, score: 1, delta: 1, penalty: 0 }
  ]) {
    const result = spadesScoreForSide({ You: fixture.tricks, Tutor: fixture.partnerTricks, Right: 0, Left: 0 },
      { You: fixture.bid, Tutor: fixture.partnerBid, Right: 3, Left: 3 }, side, fixture.bags);
    expect([result.score, result.bags, result.bagPenalty]).toEqual([fixture.score, fixture.delta, fixture.penalty]);
  }
  expect(spadesMatchComplete({ playerSide: 499, opponentSide: 400 })).toBe(false);
  expect(spadesMatchComplete({ playerSide: 500, opponentSide: 400 })).toBe(true);
  expect(spadesMatchComplete({ playerSide: 500, opponentSide: 500 })).toBe(false);
});
