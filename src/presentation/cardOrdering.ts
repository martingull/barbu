import type { Card, Suit } from "../domain/types";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type CardDisplayComparator = (left: Card, right: Card) => number;

export const displaySuitSequence: Suit[] = ["S", "H", "D", "C"];
export const displaySuitOrder: Record<Suit, number> = { S: 0, H: 1, D: 2, C: 3 };

const rankOrder: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

export function compareCardsForDisplay(left: Pick<Card, "rank" | "suit">, right: Pick<Card, "rank" | "suit">) {
  if (left.rank === "Joker" || right.rank === "Joker") return (left.rank === "Joker" ? 1 : 0) - (right.rank === "Joker" ? 1 : 0) || displaySuitOrder[left.suit] - displaySuitOrder[right.suit];
  return displaySuitOrder[left.suit] - displaySuitOrder[right.suit] || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank];
}

export function compareCanastaCardsForDisplay(left: Card, right: Card) {
  const rank = (card: Card) => card.rank === "Joker" ? 16 : card.rank === "2" ? 15 : rankOrder[card.rank as Rank];
  return rank(left) - rank(right) || displaySuitOrder[left.suit] - displaySuitOrder[right.suit]
    || left.id.localeCompare(right.id);
}

export function compareCribbageCardsForDisplay(left: Card, right: Card) {
  const rank = (card: Card) => card.rank === "A" ? 1 : rankOrder[card.rank as Rank];
  return rank(left) - rank(right) || displaySuitOrder[left.suit] - displaySuitOrder[right.suit];
}

export function sortCardsForDisplay<T extends Pick<Card, "rank" | "suit">>(cards: readonly T[], compare: (left: T, right: T) => number = compareCardsForDisplay) {
  return [...cards].sort(compare);
}
