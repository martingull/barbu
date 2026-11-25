import { displaySuitOrder } from "./cardOrdering";
import { beloteCardRank } from "../domain/beloteRules";
import type { Card, Suit } from "../domain/types";
export const beloteSeatNames = ["North", "East", "South", "West"] as const;
export const beloteSuitNames: Record<Suit, string> = { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" };
export const compareBeloteCards = (trump: Suit) => (a: Card, b: Card) => displaySuitOrder[a.suit] - displaySuitOrder[b.suit] || beloteCardRank(b, trump) - beloteCardRank(a, trump);
