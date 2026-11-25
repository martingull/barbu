import type { BeloteHand } from "../../domain/beloteSession";
import { beloteSide } from "../../domain/beloteRules";
import { beloteSeatNames } from "../../presentation/beloteDisplay";
import { formatCardLabel } from "../../presentation/cardDisplay";

export function beloteTrickFeedback(hand: BeloteHand): string {
  const trick = hand.completedTricks.at(-1);
  if (!trick) return "";
  const winner = trick.cards.find(play => play.seat === trick.winner)!;
  const last = hand.completedTricks.length === 8;
  return `${beloteSeatNames[trick.winner]} wins with ${formatCardLabel(winner.card)}. The cards are worth ${trick.points} points${last ? `, plus ${hand.result?.capot != null ? 100 : 10} for the final trick` : "; the winner leads next"}.`;
}
export function beloteResultText(hand: BeloteHand): string {
  const result = hand.result;
  if (!result) return "Everyone passed twice. No points are scored; the next player to the right deals.";
  return `${result.kind === "litige" ? `Litige: ${result.carry} points carry to the next decided deal.`
    : result.kind === "set" ? "The takers were set. Defenders receive all card points; Belote stays with its owner."
    : "The takers made their contract. Each side keeps its points."}${result.capot !== null ? " All eight tricks: capot scores 252 before Belote." : ""}${result.carriedAward ? ` The winning side also receives ${result.carriedAward} carried points.` : ""}`;
}
export function beloteLivePoints(hand: BeloteHand): [number, number] {
  const totals: [number, number] = [0, 0];
  for (const trick of hand.completedTricks) totals[beloteSide(trick.winner)] += trick.points;
  return totals;
}
