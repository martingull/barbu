import type { Card, TableCard } from "../lessonTypes";

export const barbuTrickContracts = ["No Hearts", "No Queens", "King of Hearts", "No Last Two", "No Tricks", "Hearts Trumps"] as const;
export type BarbuTrickContract = typeof barbuTrickContracts[number];

export function isBarbuTrickContract(value: unknown): value is BarbuTrickContract {
  return barbuTrickContracts.includes(value as BarbuTrickContract);
}

export function barbuTrickPoints(contract: BarbuTrickContract, cards: TableCard[], trickNumber: number): number {
  switch (contract) {
    case "No Tricks": return 2;
    case "Hearts Trumps": return 5;
    case "No Last Two": return trickNumber === 12 ? 10 : trickNumber === 13 ? 20 : 0;
    case "No Queens": return cards.filter(({ card }) => card.rank === "Q").length * 6;
    case "King of Hearts": return cards.some(({ card }) => card.rank === "K" && card.suit === "H") ? 20 : 0;
    case "No Hearts": return cards.reduce((total, { card }) => total + barbuHeartPoints(card), 0);
  }
}

function barbuHeartPoints(card: Card): number {
  return card.suit === "H" ? card.rank === "A" ? 6 : 2 : 0;
}
