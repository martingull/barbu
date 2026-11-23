import { standardDeck } from "./deck";
import { cardRank, legalCards, trickWinner, type TrickCardRules } from "./trickTakingRules";
import { trickTakingSeats } from "./trickTakingScore";
import type { Card, Suit } from "./types";

export type EuchreSeat = 0 | 1 | 2 | 3;
export type EuchreSide = 0 | 1;
export type EuchrePlay = { seat: EuchreSeat; card: Card };
export type EuchreContract = { maker: EuchreSeat; trump: Suit; alone: boolean };
export type EuchreResult = { makerTricks: number; winner: EuchreSide; points: number; kind: "made" | "march" | "lone-march" | "euchred" };
export const euchreRules = { target: 10, handSize: 5, trickCount: 5 } as const;
export const euchreSuits: readonly Suit[] = ["C", "D", "H", "S"];
const sameColour: Record<Suit, Suit> = { C: "S", S: "C", H: "D", D: "H" };

export const nextEuchreSeat = (seat: EuchreSeat): EuchreSeat => ((seat + 1) % 4) as EuchreSeat;
export const euchrePartner = (seat: EuchreSeat): EuchreSeat => ((seat + 2) % 4) as EuchreSeat;
export const euchreSide = (seat: EuchreSeat): EuchreSide => (seat % 2) as EuchreSide;
export const euchreDeck = (): Card[] => standardDeck().filter(card => ["9", "10", "J", "Q", "K", "A"].includes(card.rank));
export const isLeftBower = (card: Card, trump: Suit) => card.rank === "J" && card.suit === sameColour[trump];
export const euchreEffectiveSuit = (card: Card, trump: Suit): Suit => isLeftBower(card, trump) ? trump : card.suit;
export function euchreCardRank(card: Card, trump: Suit): number {
  return card.rank === "J" && card.suit === trump ? 16 : isLeftBower(card, trump) ? 15 : cardRank(card);
}
export const euchreCardRules = (trump: Suit): TrickCardRules => ({
  suit: card => euchreEffectiveSuit(card, trump), rank: card => euchreCardRank(card, trump)
});
export function legalEuchreCards(hand: Card[], trick: EuchrePlay[], trump: Suit): Card[] {
  return legalCards(hand, trick[0] && euchreEffectiveSuit(trick[0].card, trump), euchreCardRules(trump));
}
export function euchreTrickWinner(trick: EuchrePlay[], trump: Suit): EuchreSeat | undefined {
  const winner = trickWinner(trick.map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })), trump, euchreCardRules(trump));
  return winner ? trickTakingSeats.indexOf(winner.seat) as EuchreSeat : undefined;
}
export function scoreEuchreHand(contract: EuchreContract, makerTricks: number): EuchreResult {
  if (!Number.isInteger(makerTricks) || makerTricks < 0 || makerTricks > 5) throw Error("Invalid Euchre trick total.");
  const made = makerTricks >= 3, march = makerTricks === 5;
  return { makerTricks, winner: made ? euchreSide(contract.maker) : (1 - euchreSide(contract.maker)) as EuchreSide,
    points: !made ? 2 : march ? contract.alone ? 4 : 2 : 1,
    kind: !made ? "euchred" : march ? contract.alone ? "lone-march" : "march" : "made" };
}
