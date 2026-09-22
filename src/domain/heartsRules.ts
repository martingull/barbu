import type { Card, Suit } from "../lessonTypes";
import { legalCards } from "./trickTakingRules";

export function heartsPoints(card: Card): number {
  return card.suit === "H" ? 1 : card.id === "QS" ? 13 : 0;
}

export function legalHeartsCards(hand: Card[], led: Suit | undefined, firstTrick: boolean, heartsBroken: boolean): Card[] {
  const legal = legalCards(hand, led);
  if (!led && firstTrick) return legal.filter(card => card.id === "2C");
  if (!led && !heartsBroken) {
    const nonHearts = legal.filter(card => card.suit !== "H");
    return nonHearts.length ? nonHearts : legal;
  }
  if (led && firstTrick) {
    const nonPenalties = legal.filter(card => heartsPoints(card) === 0);
    return nonPenalties.length ? nonPenalties : legal;
  }
  return legal;
}
