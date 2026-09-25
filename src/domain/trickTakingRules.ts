import type { Card, Suit, TableCard } from "./types";

export function cardRank(card: Card): number {
  return ({ J: 11, Q: 12, K: 13, A: 14 } as Record<string, number>)[card.rank] ?? Number(card.rank);
}

export function legalCards(hand: Card[], led?: Suit): Card[] {
  const suited = hand.filter(card => card.suit === led);
  return suited.length ? suited : hand;
}

export function trickWinner(cards: TableCard[], trump?: Suit | null): TableCard | undefined {
  const winningSuit = cards.some(played => played.card.suit === trump) ? trump : cards[0]?.card.suit;
  return cards.filter(played => played.card.suit === winningSuit).reduce<TableCard | undefined>(
    (winner, played) => !winner || cardRank(played.card) > cardRank(winner.card) ? played : winner,
    undefined
  );
}
