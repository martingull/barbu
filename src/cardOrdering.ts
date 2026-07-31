import type { Card, Suit } from "./lessonTypes";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

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
  return displaySuitOrder[left.suit] - displaySuitOrder[right.suit] || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank];
}

export function sortCardsForDisplay<T extends Pick<Card, "rank" | "suit">>(cards: T[]) {
  return [...cards].sort(compareCardsForDisplay);
}
