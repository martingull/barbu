import type { Card, Suit } from "./types";

const suits: Suit[] = ["S", "H", "D", "C"];
export const bridgeHighCardPoints = (cards: Card[]) => cards.reduce((n, card) => n + ({ A: 4, K: 3, Q: 2, J: 1 }[card.rank] ?? 0), 0);
export const bridgeSuitCount = (cards: Card[], suit: string) => cards.filter(card => card.suit === suit).length;
export const bridgeIsBalanced = (cards: Card[]) => ["3-3-3-4", "2-3-4-4", "2-3-3-5"].includes(suits.map(suit => bridgeSuitCount(cards, suit)).sort().join("-"));

export function parseBridgeBid(call: string) {
  const normalized = call.trim().toUpperCase().replace(/NO TRUMPS?/g, "NT").replace(/CLUBS?/g, "C").replace(/DIAMONDS?/g, "D").replace(/HEARTS?/g, "H").replace(/SPADES?/g, "S").replace(/[♣♦♥♠]/g, suit => ({ "♣": "C", "♦": "D", "♥": "H", "♠": "S" }[suit]!)).replace(/\s+/g, "");
  const match = /^([1-7])(C|D|H|S|NT)$/.exec(normalized);
  return match ? { level: Number(match[1]), strain: match[2], id: normalized } : null;
}
