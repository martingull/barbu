import type { Card, Suit } from "../lessonTypes";
import { cardRank } from "./trickTakingRules";

export const dominoSuits: Suit[] = ["C", "D", "H", "S"];
export const dominoRanks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const compareDominoCards = (a: Card, b: Card) => dominoSuits.indexOf(a.suit) - dominoSuits.indexOf(b.suit) || cardRank(a) - cardRank(b);

// Legacy browser saves need the old unbounded shuffle only to recover their original deal.
export function dealDomino(seed: number, legacyBrowser = false): Card[][] {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error("Invalid Domino seed");
  const deck: Card[] = dominoSuits.flatMap(suit => dominoRanks.map(rank => ({ id: rank + suit, label: rank + suit, rank, suit })));
  let rng = BigInt(seed) ^ 0x9e3779b97f4a7c15n;
  for (let index = deck.length - 1; index > 0; index--) {
    rng = rng * 6364136223846793005n + 1n;
    if (!legacyBrowser) rng = BigInt.asUintN(64, rng);
    const swap = Number(rng % BigInt(index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return [0, 1, 2, 3].map(seat => deck.filter((_, index) => index % 4 === seat).sort(compareDominoCards));
}
