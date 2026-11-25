import { standardDeck } from "./deck";
import { trickWinner, type TrickCardRules } from "./trickTakingRules";
import { trickTakingSeats } from "./trickTakingScore";
import type { Card, Suit } from "./types";

export type BeloteSeat = 0 | 1 | 2 | 3;
export type BeloteSide = 0 | 1;
export type BelotePlay = { seat: BeloteSeat; card: Card };
export const beloteSuits: readonly Suit[] = ["C", "D", "H", "S"];
export const beloteRanks = ["7", "8", "9", "J", "Q", "K", "10", "A"] as const;
const trumpRanks = ["7", "8", "Q", "K", "10", "A", "9", "J"];
export const beloteRules = { target: 1000, trickCount: 8, profile: "Classic, no announcements" } as const;
export const nextBeloteSeat = (seat: BeloteSeat): BeloteSeat => ((seat + 3) % 4) as BeloteSeat;
export const beloteSide = (seat: BeloteSeat): BeloteSide => (seat % 2) as BeloteSide;
export const beloteDeck = () => standardDeck().filter(card => (beloteRanks as readonly string[]).includes(card.rank));
export const beloteCardRank = (card: Card, trump: Suit) => (card.suit === trump ? trumpRanks : [...beloteRanks]).indexOf(card.rank);
export function beloteCardPoints(card: Card, trump: Suit): number {
  return card.suit === trump && card.rank === "J" ? 20 : card.suit === trump && card.rank === "9" ? 14
    : ({ A: 11, "10": 10, K: 4, Q: 3, J: 2 } as Record<string, number>)[card.rank] ?? 0;
}
export const beloteCardRules = (trump: Suit): TrickCardRules => ({ suit: card => card.suit, rank: card => beloteCardRank(card, trump) });
export function beloteTrickWinner(trick: BelotePlay[], trump: Suit): BeloteSeat | undefined {
  const winner = trickWinner(trick.map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })), trump, beloteCardRules(trump));
  return winner ? trickTakingSeats.indexOf(winner.seat) as BeloteSeat : undefined;
}
export function legalBeloteCards(hand: Card[], trick: BelotePlay[], trump: Suit, seat: BeloteSeat): Card[] {
  if (!trick.length) return hand;
  const led = trick[0].card.suit, follows = hand.filter(card => card.suit === led);
  const winner = beloteTrickWinner(trick, trump)!;
  const trumps = hand.filter(card => card.suit === trump);
  const highest = Math.max(-1, ...trick.filter(play => play.card.suit === trump).map(play => beloteCardRank(play.card, trump)));
  const over = trumps.filter(card => beloteCardRank(card, trump) > highest);
  if (follows.length) return led === trump && over.length ? over : follows;
  // In the federation profile, a winning partner permits any discard,
  // including a lower trump even when a higher one is held.
  if (beloteSide(winner) === beloteSide(seat)) return hand;
  return trumps.length ? over.length ? over : trumps : hand;
}

export type BeloteScore = {
  cardPoints: [number, number]; belote: [number, number]; totals: [number, number];
  awarded: [number, number]; kind: "made" | "set" | "litige";
  winner: BeloteSide | null; capot: BeloteSide | null; carry: number; carriedAward: number;
};
export function scoreBeloteHand(taker: BeloteSide, points: [number, number], tricks: [number, number], last: BeloteSide,
  beloteOwner: BeloteSide | null, carry = 0): BeloteScore {
  if (![0, 1].includes(taker) || ![0, 1].includes(last) || beloteOwner !== null && ![0, 1].includes(beloteOwner)
    || points.some(n => !Number.isInteger(n) || n < 0) || points[0] + points[1] !== 152
    || tricks.some(n => !Number.isInteger(n) || n < 0 || n > 8) || tricks[0] + tricks[1] !== 8
    || tricks[last] === 0 || tricks.some((n, side) => n === 0 && points[side] !== 0)
    || !Number.isSafeInteger(carry) || carry < 0) throw Error("Invalid Belote hand totals.");
  const capot = tricks[0] === 8 ? 0 : tricks[1] === 8 ? 1 : null;
  const cardPoints: [number, number] = [...points];
  cardPoints[last] += capot === null ? 10 : 100;
  const belote: [number, number] = [beloteOwner === 0 ? 20 : 0, beloteOwner === 1 ? 20 : 0];
  const totals: [number, number] = [cardPoints[0] + belote[0], cardPoints[1] + belote[1]];
  const defender = (1 - taker) as BeloteSide;
  const kind = totals[taker] === totals[defender] ? "litige" : totals[taker] > totals[defender] ? "made" : "set";
  const winner = kind === "litige" ? null : kind === "made" ? taker : defender;
  const awarded: [number, number] = kind === "set" ? [...belote] : [...totals];
  if (kind === "set") awarded[defender] += capot === null ? 162 : 252;
  if (kind === "litige") awarded[taker] = 0;
  else awarded[winner!] += carry;
  return { cardPoints, belote, totals, awarded, kind, winner, capot,
    carry: kind === "litige" ? carry + totals[taker] : 0, carriedAward: kind === "litige" ? 0 : carry };
}
