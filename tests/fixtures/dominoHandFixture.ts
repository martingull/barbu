import fixtures from "./domino-hands.json" with { type: "json" };
import type { Card, DominoHandState } from "../../src/domain/types";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";

export const dominoFixtures = fixtures;
const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Card["suit"] });

export function inflateDominoHand(fixture: typeof fixtures.native[number] | typeof fixtures.browser[number], phase: "initial" | "mid" | "final" = "initial"): DominoHandState {
  const s = fixture[phase];
  return { ...s, id: fixture.id, contract: "Domino", hands: s.hands.map(h => h.map(card)),
    layout: s.layout.map(l => l.map(card)), playerHand: s.hands[2].map(card), currentPlayer: seats[s.currentPlayerIndex],
    passedPlayers: s.passedPlayers as DominoHandState["passedPlayers"], outOrder: s.outOrder as DominoHandState["outOrder"],
    status: s.status as DominoHandState["status"] };
}

// Matches the projection used to capture native digests, without production rule evaluation.
export function compactDominoHand(s: DominoHandState) {
  return { hands: s.hands.map(h => h.map(c => c.id)), currentPlayerIndex: s.currentPlayerIndex,
    startRank: s.startRank, layout: s.layout.map(h => h.map(c => c.id)), passedPlayers: s.passedPlayers,
    outOrder: s.outOrder, legalCardIds: s.legalCardIds, scores: s.scores, cardsRemaining: s.cardsRemaining, status: s.status, prompt: s.prompt };
}
