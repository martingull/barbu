import type { CompletedHandTrick, FullHandState, Seat } from "./types";
import type { SpadesSession } from "./spadesSession";
import { trickWinner } from "./trickTakingRules";
import { spadesBooksForSide, spadesScoreForSide, spadesTrickCounts } from "./spadesScoring";
import type { SpadesBidState } from "./spadesBidding";

export type SpadesLearningPosition = Pick<FullHandState, "playerHand" | "legalCardIds" | "currentTrick" | "completedTricks"> & {
  bids: SpadesBidState; playStarted: boolean;
};
export function spadesLearningPosition(session: SpadesSession): SpadesLearningPosition {
  const { playerHand, legalCardIds, currentTrick, completedTricks } = session.fullHand;
  return { playerHand, legalCardIds, currentTrick, completedTricks, bids: session.bids, playStarted: session.playStarted };
}
export function spadesLearningScore(tricks: CompletedHandTrick[], bids: SpadesBidState, seats: Seat[], carriedBags = 0) {
  const counts = spadesTrickCounts(tricks);
  const scored = spadesScoreForSide(counts, bids, seats, carriedBags);
  return { ...scored, remainingBags: carriedBags + scored.bags };
}
export function spadesLearningTrick(trick: CompletedHandTrick) {
  const winner = trickWinner(trick.cards, "S");
  const player = trick.cards.find(play => play.seat === "You");
  const lead = trick.cards[0];
  return winner && player && lead ? { winner, player, lead, trumped: winner.card.suit === "S" } : null;
}
export function spadesLearningRecap(tricks: CompletedHandTrick[], bids: SpadesBidState) {
  const moments = tricks.map((trick, index) => {
    const facts = spadesLearningTrick(trick);
    const ours = trick.winner === "You" || trick.winner === "Tutor";
    const before = spadesBooksForSide(spadesTrickCounts(tricks.slice(0, index)), bids, ["You", "Tutor"]);
    const after = spadesBooksForSide(spadesTrickCounts(tricks.slice(0, index + 1)), bids, ["You", "Tutor"]);
    const nilFailed = trick.winner !== "Unknown" && bids[trick.winner] === 0 && !tricks.slice(0, index).some(t => t.winner === trick.winner);
    return { trick, number: index + 1, facts, nilFailed, targetReached: ours && before.won < after.bid && after.won === after.bid,
      firstBag: ours && before.extra === 0 && after.extra > 0 };
  });
  const selected = new Set([moments.find(m => m.nilFailed), moments.find(m => m.targetReached), moments.find(m => m.firstBag)]);
  for (const moment of [moments.find(m => m.facts?.trumped), moments.at(-1)]) {
    if ([...selected].filter(Boolean).length < 3 && moment) selected.add(moment);
  }
  return moments.filter(moment => selected.has(moment) && moment.facts);
}
