import type { Card, Suit } from "./types";

export function standardDeck(): Card[] {
  const suits: Suit[] = ["C", "D", "H", "S"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  return suits.flatMap(suit => ranks.map(rank => ({ id: rank + suit, label: rank + suit, rank, suit })));
}

// Preserve the original trick-taking shuffle so existing seeds and saves stay stable.
export function shuffledDeck(seed: number): Card[] {
  const deck = standardDeck();
  let state = (seed ^ 0xa0761d64) >>> 0;
  for (let index = deck.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}
