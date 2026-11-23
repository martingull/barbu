import type { Card, Suit, TableCard } from "./types";

export function cardRank(card: Card): number {
  return ({ J: 11, Q: 12, K: 13, A: 14 } as Record<string, number>)[card.rank] ?? Number(card.rank);
}

export type TrickCardRules = { suit(card: Card): Suit; rank(card: Card): number };
const standardRules: TrickCardRules = { suit: card => card.suit, rank: cardRank };

export function legalCards(hand: Card[], led?: Suit, rules: TrickCardRules = standardRules): Card[] {
  const suited = hand.filter(card => rules.suit(card) === led);
  return suited.length ? suited : hand;
}

export function trickWinner(cards: TableCard[], trump?: Suit | null, rules: TrickCardRules = standardRules): TableCard | undefined {
  const winningSuit = cards.some(played => rules.suit(played.card) === trump) ? trump
    : cards[0] && rules.suit(cards[0].card);
  return cards.filter(played => rules.suit(played.card) === winningSuit).reduce<TableCard | undefined>(
    (winner, played) => !winner || rules.rank(played.card) > rules.rank(winner.card) ? played : winner,
    undefined
  );
}
