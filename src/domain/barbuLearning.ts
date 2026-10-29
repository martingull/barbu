import { typescriptHandEngine } from "./handEngine";
import { dominoHandEngine } from "./dominoHand";
import { transitionReviewedHand, type ReviewedHand } from "./reviewedHand";
import { isBarbuTrickContract } from "./barbuRules";
import type { DominoHandState, FullHandContract, FullHandState } from "./types";

export type BarbuLearningHand = { kind: "trick"; reviewed: ReviewedHand } | { kind: "domino"; hand: DominoHandState };
export type BarbuLearningEvent = { type: "play-card"; cardId: string } | { type: "pass" } | { type: "next-trick" };

export function createBarbuLearningHand(contract: FullHandContract, seed: number): BarbuLearningHand {
  if (contract === "Domino") return { kind: "domino", hand: dominoHandEngine.start({ seed }) };
  if (!isBarbuTrickContract(contract)) throw Error("Choose a Barbu contract.");
  return { kind: "trick", reviewed: { fullHand: typescriptHandEngine(contract)!.start({ seed }), fullHandReviewTrickCount: 0 } };
}

export function transitionBarbuLearningHand(state: BarbuLearningHand, event: BarbuLearningEvent): BarbuLearningHand {
  if (state.kind === "domino") return event.type === "next-trick" ? state
    : { kind: "domino", hand: dominoHandEngine.transition(state.hand, event) };
  if (event.type === "pass") throw Error("Follow suit or discard; trick-taking contracts do not allow passing.");
  return { kind: "trick", reviewed: transitionReviewedHand(state.reviewed, event, typescriptHandEngine(state.reviewed.fullHand.contract)!) };
}

// Only player-visible information reaches the coach, never the seed or opponents' hands.
export function barbuLearningPosition(hand: FullHandState) {
  return { contract: hand.contract, playerHand: hand.playerHand, currentTrick: hand.currentTrick,
    completedTricks: hand.completedTricks, trickNumber: hand.trickNumber };
}
export type BarbuLearningPosition = ReturnType<typeof barbuLearningPosition>;

export function dominoLearningPosition(hand: DominoHandState) {
  return { layout: hand.layout, playerHand: hand.playerHand, legalCardIds: hand.legalCardIds,
    startRank: hand.startRank, outOrder: hand.outOrder };
}

export function barbuLearningRecap(hand: BarbuLearningPosition) {
  const tricks = hand.completedTricks;
  const important = hand.contract === "No Last Two" ? 11
    : tricks.findIndex(trick => trick.penalty > 0 && trick.winner === "You");
  return [...new Set([0, important, tricks.length - 1].filter(index => index >= 0 && index < tricks.length))]
    .map(index => ({ number: index + 1, trick: tricks[index] }));
}
