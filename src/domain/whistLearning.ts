import type { CompletedHandTrick, FullHandState, Suit } from "./types";
import { trickWinner } from "./trickTakingRules";
import { partnershipTrickCounts } from "./trickTakingScore";
import { whistOddTricksForSide } from "./whistScoring";

export type WhistLearningPosition = Pick<FullHandState,
  "playerHand" | "legalCardIds" | "currentTrick" | "completedTricks" | "whistDealer" | "whistTurnedTrump"> & { trump: Suit };

export function whistLearningPosition(hand: FullHandState): WhistLearningPosition {
  const suffix = hand.id.split("-").at(-1);
  const trump = hand.trumpSuit ?? hand.whistTurnedTrump?.suit
    ?? (suffix === "C" || suffix === "D" || suffix === "H" ? suffix : "S");
  return { playerHand: hand.playerHand, legalCardIds: hand.legalCardIds, currentTrick: hand.currentTrick,
    completedTricks: hand.completedTricks, whistDealer: hand.whistDealer, whistTurnedTrump: hand.whistTurnedTrump, trump };
}

export function whistLearningScore(tricks: CompletedHandTrick[]) {
  const counts = partnershipTrickCounts(tricks);
  return { tricks: counts, points: { playerSide: whistOddTricksForSide(counts.playerSide),
    opponentSide: whistOddTricksForSide(counts.opponentSide) } };
}

export function whistLearningTrick(trick: CompletedHandTrick, trump: Suit) {
  const winner = trickWinner(trick.cards, trump);
  if (!winner) return null;
  return { winner, lead: trick.cards[0], player: trick.cards.find(play => play.seat === "You"),
    trumped: winner.card.suit === trump };
}

export function whistLearningRecap(tricks: CompletedHandTrick[], trump: Suit) {
  const firstTrump = tricks.findIndex(trick => whistLearningTrick(trick, trump)?.trumped);
  const firstPoint = tricks.findIndex((_, index) => {
    const { points } = whistLearningScore(tricks.slice(0, index + 1));
    return points.playerSide > 0 || points.opponentSide > 0;
  });
  return [...new Set([firstTrump, firstPoint, tricks.length - 1].filter(index => index >= 0))]
    .sort((a, b) => a - b).map(index => ({ number: index + 1, trick: tricks[index],
      kind: index === firstPoint ? "first-point" : index === firstTrump ? "trump" : "last" }));
}
