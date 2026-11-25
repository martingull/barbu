import { beloteCardPoints, beloteCardRank, beloteSide, beloteTrickWinner, legalBeloteCards,
  scoreBeloteHand, type BelotePlay, type BeloteSide } from "./beloteRules";
import { advanceBeloteOpponents, beloteTakeChoices, chooseBeloteAction } from "./belotePolicy";
import { createBeloteSession, transitionBeloteSession, belotePosition, type BeloteSession, type BeloteAction, type BelotePosition } from "./beloteSession";
import type { Card, Suit } from "./types";

export type BeloteQuestion =
  | { kind: "value"; hand: Card[]; trump: Suit }
  | { kind: "rank"; hand: Card[]; trump: Suit }
  | { kind: "belote"; hand: Card[]; trump: Suit }
  | { kind: "take"; hand: Card[]; trump: Suit; upcard: Card; round: 1 | 2 }
  | { kind: "play"; hand: Card[]; trump: Suit; trick: BelotePlay[]; goal: "legal" | "support" }
  | { kind: "score"; hand: Card[]; trump: Suit; points: [number, number]; tricks: [number, number]; last: BeloteSide; taker: BeloteSide; bonus: BeloteSide | null };
export function beloteRecommendedAnswer(q: BeloteQuestion): string {
  if (q.kind === "value") return String(beloteCardPoints(q.hand[0], q.trump));
  if (q.kind === "rank") return [...q.hand].sort((a, b) => beloteCardRank(b, q.trump) - beloteCardRank(a, q.trump))[0].id;
  if (q.kind === "belote") return q.hand.some(card => card.suit === q.trump && card.rank === "K") && q.hand.some(card => card.suit === q.trump && card.rank === "Q") ? "20" : "0";
  if (q.kind === "score") return String(scoreBeloteHand(q.taker, q.points, q.tricks, q.last, q.bonus).awarded[0]);
  if (q.kind === "take") {
    const best = beloteTakeChoices(q)[0]; return best.strength >= 5 ? best.trump : "pass";
  }
  const legal = legalBeloteCards(q.hand, q.trick, q.trump, 2);
  return q.goal === "support" ? [...legal].sort((a, b) => beloteCardPoints(b, q.trump) - beloteCardPoints(a, q.trump))[0].id : legal[0].id;
}
export function evaluateBeloteAnswer(q: BeloteQuestion, answer: string) {
  let illegal = false;
  if (q.kind === "take") illegal = answer !== "pass" && !beloteTakeChoices(q).some(choice => choice.trump === answer);
  if (q.kind === "play") illegal = !legalBeloteCards(q.hand, q.trick, q.trump, 2).some(card => card.id === answer);
  const good = !illegal && (q.kind === "play" && q.goal === "legal" ? true : answer === beloteRecommendedAnswer(q));
  const card = q.hand.find(card => card.id === answer);
  const reason = illegal ? "illegal_play" : q.kind === "play"
    ? card?.suit === q.trick[0]?.card.suit ? "followed_suit" : card?.suit === q.trump ? "trumped" : "void_discard"
    : q.kind === "take" ? "taking_plan" : q.kind === "rank" ? "compared_ranks" : "counted_points";
  return { good, illegal, reason };
}
export function beloteGuidance(position: BelotePosition): { rule: string; tip: string } {
  if (position.phase === "calling") {
    const suggestion = chooseBeloteAction({ ...position, turn: position.viewer });
    return { rule: `Round ${position.round}: ${position.round === 1 ? "take the upcard suit or pass" : "choose one of the other three suits or pass"}. Only your first five cards are known. The taker receives the upcard and two more; everyone else receives three.`,
      tip: suggestion.type === "take" ? `The visible trump strength suggests taking ${{ C: "clubs", D: "diamonds", H: "hearts", S: "spades" }[suggestion.trump]}. This is a heuristic, not a guaranteed contract.` : "Passing is the cautious suggestion from these visible cards. Taking commits your side to more points than the defenders." };
  }
  if (!position.contract) return { rule: "Eight passes mean a new dealer and no score.", tip: "Your saved match is unchanged." };
  if (position.phase === "review" || position.phase === "complete") {
    const trick = position.completedTricks.at(-1);
    return { rule: trick ? `This trick contains ${trick.points} card points. Its winner leads next.` : "The deal is complete.",
      tip: "Add the last-trick bonus and any Belote only when settling the full deal." };
  }
  const trump = position.contract.trump, trick = position.currentTrick;
  const follows = trick.length && position.hand.some(card => card.suit === trick[0].card.suit);
  const winner = beloteTrickWinner(trick, trump);
  const rule = !trick.length ? "You lead. Any card in your hand is legal. Deal and play run anticlockwise."
    : follows ? trick[0].card.suit === trump ? "Follow trump and beat the highest trump when you can, even if your partner leads the trick." : "Follow the led suit when you can. You do not have to beat a plain-suit card."
    : winner !== undefined && beloteSide(winner) === beloteSide(position.viewer) ? "You are void and your partner is winning: you may discard any card, including a trump."
    : "You are void and an opponent is winning: trump if possible, overtrumping if you can; otherwise undertrump. With no trumps, discard.";
  const action = chooseBeloteAction({ ...position, turn: position.viewer });
  return { rule, tip: action.type === "play-card" ? `Suggested card: ${action.cardId}. Preserve useful winners and feed points to a secure partner. Trump J scores 20 and 9 scores 14; ordinary aces score 11. The last trick adds 10. This is advice, not a forced play.` : "Count card points, not just tricks." };
}
export function createBeloteGuidedSession(seed: number): BeloteSession {
  return advanceBeloteOpponents(createBeloteSession(seed));
}
export function transitionBeloteGuidedSession(session: BeloteSession, action: BeloteAction): BeloteSession {
  if (action.type === "next-hand" || session.hand.phase === "complete" || session.hand.phase === "passed_out") throw Error("This guided deal is complete.");
  if (action.type !== "next-trick" && session.hand.turn !== 2) throw Error("Wait for your turn.");
  return advanceBeloteOpponents(transitionBeloteSession(session, action));
}
export const replayBeloteGuidedSession = (session: BeloteSession) => createBeloteGuidedSession(session.initialSeed);
