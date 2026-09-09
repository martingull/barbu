import { test, expect } from "@playwright/test";
import cases from "../fixtures/spades-nil-policy.json" with { type: "json" };
import { chooseBrowserOpponentCardForState } from "../../src/browserHandFallback";
import type { Card, FullHandState, Seat, Suit } from "../../src/lessonTypes";

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
