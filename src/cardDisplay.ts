import type { Card, Suit } from "./lessonTypes";
import { sortCardsForDisplay } from "./cardOrdering";

const suitSymbols: Record<Suit, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠"
};

const symbolBySuitCode: Record<string, string> = suitSymbols;

export function suitSymbol(suit: Suit) {
  return suitSymbols[suit];
}

export function formatCardLabel(card: Pick<Card, "rank" | "suit">) {
  return `${card.rank}${suitSymbol(card.suit)}`;
}

export function formatCardList(cards: Pick<Card, "rank" | "suit">[]) {
  return sortCardsForDisplay(cards).map(formatCardLabel).join(", ");
}

export function formatCardText(text: string) {
  return text.replace(/\b(10|[2-9JQKA])([CDHS])\b/g, (_match, rank: string, suit: string) => {
    return `${rank}${symbolBySuitCode[suit] ?? suit}`;
  });
}
