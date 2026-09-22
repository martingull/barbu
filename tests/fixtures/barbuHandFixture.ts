import native from "./barbu-native-hands.json" with { type: "json" };
import type { Card, CompletedHandTrick, FullHandState, Seat, TableCard } from "../../src/lessonTypes";

export const nativeBarbuHands = native.cases;
const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Card["suit"] });
const table = (plays: TableCard[]) => plays.map(p => `${p.seat}:${p.card.id}`);
const plays = (items: string[]): TableCard[] => items.map(item => {
  const [seat, id] = item.split(":");
  return { seat: seat as Seat, card: card(id) };
});

export function nativeBarbuHand(fixture: typeof native.cases[number], finished = false): FullHandState {
  const s = finished ? fixture.final : fixture.initial;
  return { ...s, id: fixture.id, contract: fixture.contract as FullHandState["contract"],
    hands: s.hands.map(hand => hand.map(card)), playerHand: s.hands[2].map(card),
    currentPlayer: seats[s.currentPlayerIndex], currentTrick: plays(s.currentTrick),
    completedTricks: s.completedTricks.map(t => ({ ...t, cards: plays(t.cards), winner: seats[t.winnerIndex],
      outcome: t.outcome as CompletedHandTrick["outcome"], tacticalTags: t.tacticalTags as CompletedHandTrick["tacticalTags"] })),
    status: s.status as FullHandState["status"], prompt: "" };
}

// This is also the projection used when capturing the native SHA-256 digests.
export function compactBarbuHand(s: FullHandState) {
  return { hands: s.hands.map(h => h.map(c => c.id).sort()), currentPlayerIndex: s.currentPlayerIndex,
    currentTrick: table(s.currentTrick), completedTricks: s.completedTricks.map(t => ({
      cards: table(t.cards), winnerIndex: t.winnerIndex, penalty: t.penalty, outcome: t.outcome, tacticalTags: t.tacticalTags
    })), legalCardIds: [...s.legalCardIds].sort(), playerPenalty: s.playerPenalty, totalPenalty: s.totalPenalty,
    cardsRemaining: s.cardsRemaining, trickNumber: s.trickNumber, status: s.status };
}
