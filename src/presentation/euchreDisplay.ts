import { cardRank } from "../domain/trickTakingRules";
import { euchreCardRank, euchreEffectiveSuit } from "../domain/euchreRules";
import { displaySuitOrder } from "./cardOrdering";
import type { Card, Suit } from "../domain/types";

export const euchreSeatNames = ["North", "East", "South", "West"] as const;
export const euchreSuitNames: Record<Suit, string> = { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" };
export function compareEuchreCards(trump?: Suit) {
  return (a: Card, b: Card) => displaySuitOrder[trump ? euchreEffectiveSuit(a, trump) : a.suit]
    - displaySuitOrder[trump ? euchreEffectiveSuit(b, trump) : b.suit]
    || (trump ? euchreCardRank(a, trump) - euchreCardRank(b, trump) : cardRank(a) - cardRank(b));
}
