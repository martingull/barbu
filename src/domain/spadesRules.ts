import type { Card, FullHandState, Suit } from "./types";
import { legalCards } from "./trickTakingRules";

export function spadesHaveBeenBroken(state: Pick<FullHandState, "completedTricks" | "currentTrick">): boolean {
  return [...state.completedTricks.flatMap(trick => trick.cards), ...state.currentTrick].some(play => play.card.suit === "S");
}

export function legalSpadesCards(hand: Card[], led: Suit | undefined, broken: boolean): Card[] {
  const legal = legalCards(hand, led);
  if (led || broken) return legal;
  const plain = legal.filter(card => card.suit !== "S");
  return plain.length ? plain : legal;
}
