import type { CompletedHandTrick, FullHandState, Seat } from "./types";
import type { SpadesSession } from "./spadesSession";
import { trickWinner } from "./trickTakingRules";
import { spadesScoreForSide, spadesSideBid } from "./spadesScoring";
import type { SpadesBidState } from "./spadesBidding";
import { trickTakingSeats } from "./trickTakingScore";

export type SpadesLearningPosition = Pick<FullHandState, "playerHand" | "legalCardIds" | "currentTrick" | "completedTricks"> & {
  bids: SpadesBidState; playStarted: boolean;
};
export function spadesLearningPosition(session: SpadesSession): SpadesLearningPosition {
  const { playerHand, legalCardIds, currentTrick, completedTricks } = session.fullHand;
  return { playerHand, legalCardIds, currentTrick, completedTricks, bids: session.bids, playStarted: session.playStarted };
}
export function spadesLearningScore(tricks: CompletedHandTrick[], bids: SpadesBidState, seats: Seat[], carriedBags = 0) {
  const counts = Object.fromEntries(trickTakingSeats.map(seat => [seat, tricks.filter(trick => trick.winner === seat).length])) as Record<Seat, number>;
  const scored = spadesScoreForSide(counts, bids, seats, carriedBags);
  const bid = spadesSideBid(bids, seats);
  const won = seats.reduce((total, seat) => total + counts[seat], 0);
  const extra = Math.max(0, won - bid);
  const nilPoints = scored.nilResults.reduce((sum, nil) => sum + nil.score, 0);
  return { ...scored, bid, won, extra, contractPoints: scored.score - extra - nilPoints + scored.bagPenalty,
    remainingBags: carriedBags + scored.bags };
}
export function spadesLearningTrick(trick: CompletedHandTrick) {
  const winner = trickWinner(trick.cards, "S");
  const player = trick.cards.find(play => play.seat === "You");
  const lead = trick.cards[0];
  return winner && player && lead ? { winner, player, lead, trumped: winner.card.suit === "S" } : null;
}
export function spadesLearningRecap(tricks: CompletedHandTrick[], bids: SpadesBidState) {
  const target = spadesSideBid(bids, ["You", "Tutor"]);
  let ownBooks = 0;
  const moments = tricks.map((trick, index) => {
    const facts = spadesLearningTrick(trick);
    const ours = trick.winner === "You" || trick.winner === "Tutor";
    if (ours) ownBooks++;
    const nilFailed = trick.winner !== "Unknown" && bids[trick.winner] === 0 && !tricks.slice(0, index).some(t => t.winner === trick.winner);
    return { trick, number: index + 1, facts, nilFailed, targetReached: ours && ownBooks === target,
      firstBag: ours && ownBooks === target + 1 };
  });
  const selected = new Set([moments.find(m => m.nilFailed), moments.find(m => m.targetReached), moments.find(m => m.firstBag)]);
  for (const moment of [moments.find(m => m.facts?.trumped), moments.at(-1)]) {
    if ([...selected].filter(Boolean).length < 3 && moment) selected.add(moment);
  }
  return moments.filter(moment => selected.has(moment) && moment.facts);
}
