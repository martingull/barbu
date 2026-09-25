import type { Card, FullHandState, Seat, Suit } from "./types";
import { cardRank } from "./trickTakingRules";
import { trickTakingSeats } from "./trickTakingScore";

export type SpadesBidState = Record<Seat, number>;
export const defaultSpadesBidState: SpadesBidState = { You: 4, Tutor: 3, Left: 3, Right: 3 };
export function spadesClampBid(value: number) { return Number.isFinite(value) ? Math.max(0, Math.min(13, Math.trunc(value))) : 0; }
export function originalSpadesCards(hand: FullHandState, seat: Seat): Card[] {
  return [...hand.hands[trickTakingSeats.indexOf(seat)],
    ...[...hand.completedTricks.flatMap(trick => trick.cards), ...hand.currentTrick]
      .filter(play => play.seat === seat).map(play => play.card)];
}
export function spadesBidFromId(id: string, index: number): number | undefined {
  const value = id.match(/-bids-([0-9.]+)-S$/)?.[1].split(".")[index];
  return value === undefined ? undefined : spadesClampBid(Number(value));
}
function cardsBySuit(cards: Card[]) {
  return cards.reduce(
    (groups, card) => {
      groups[card.suit] = [...groups[card.suit], card];
      return groups;
    },
    { C: [], D: [], H: [], S: [] } as Record<Suit, Card[]>
  );
}

export function shouldSuggestSpadesNil(cards: Card[]) {
  const suitGroups = cardsBySuit(cards);
  const spades = suitGroups.S;
  const hasAce = cards.some((card) => card.rank === "A");
  const hasHighSpade = spades.some((card) => cardRank(card) >= 12);
  const hasProtectedKing = cards.some(
    (card) => card.suit !== "S" && card.rank === "K" && suitGroups[card.suit].length >= 2
  );
  const highCardCount = cards.filter((card) => cardRank(card) >= 11).length;

  return !hasAce && !hasHighSpade && !hasProtectedKing && highCardCount <= 2 && spades.length <= 3;
}

export function suggestedSpadesBidForCards(cards: Card[]) {
  if (shouldSuggestSpadesNil(cards)) {
    return 0;
  }

  const suitGroups = cardsBySuit(cards);
  const nonSpadeAces = cards.filter((card) => card.suit !== "S" && card.rank === "A").length;
  const protectedNonSpadeKings = cards.filter(
    (card) => card.suit !== "S" && card.rank === "K" && suitGroups[card.suit].length >= 2
  ).length;
  const highSpades = suitGroups.S.filter((card) => cardRank(card) >= 12).length;
  const longSpades = Math.max(0, suitGroups.S.length - 3);
  const estimate = nonSpadeAces + protectedNonSpadeKings + highSpades + longSpades;

  return spadesClampBid(Math.max(1, estimate));
}

export function suggestedSpadesBidsForHand(hand: FullHandState | null): SpadesBidState {
  if (!hand) {
    return { ...defaultSpadesBidState };
  }

  return {
    You: suggestedSpadesBidForCards(originalSpadesCards(hand, "You")),
    Tutor: suggestedSpadesBidForCards(originalSpadesCards(hand, "Tutor")),
    Left: suggestedSpadesBidForCards(originalSpadesCards(hand, "Left")),
    Right: suggestedSpadesBidForCards(originalSpadesCards(hand, "Right"))
  };
}
