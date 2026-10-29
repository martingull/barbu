import type { BridgeContractState, CompletedHandTrick, FullHandState } from "./types";
import { bridgeSideForSeat } from "./bridgeAuction";
import { trickWinner } from "./trickTakingRules";

// Coaching receives only South's cards, exposed dummy and public play, never a deal seed or hidden hands.
export function bridgeLearningPosition(hand: FullHandState) {
  const contract = hand.bridgeContract!;
  const isDummyTurn = bridgeSideForSeat(contract.declarer) === "NS" && hand.currentPlayer === contract.dummy;
  return { contract, currentPlayer: hand.currentPlayer, currentTrick: hand.currentTrick,
    completedTricks: hand.completedTricks, playerHand: hand.playerHand, dummyHand: hand.dummyHand,
    activeHand: isDummyTurn ? hand.dummyHand ?? [] : hand.playerHand };
}
export type BridgeLearningPosition = ReturnType<typeof bridgeLearningPosition>;

export function bridgeLearningCounts(tricks: CompletedHandTrick[], contract: BridgeContractState) {
  const declarer = tricks.filter(trick => trick.winner !== "Unknown" && bridgeSideForSeat(trick.winner) === bridgeSideForSeat(contract.declarer)).length;
  return { declarer, defenders: tricks.length - declarer, needed: Math.max(0, contract.target - declarer) };
}

export function bridgeLearningTrick(trick: CompletedHandTrick, contract: BridgeContractState) {
  const winner = trickWinner(trick.cards, contract.strain === "NT" ? null : contract.strain);
  if (!winner) return null;
  return { winner, lead: trick.cards[0], trumped: winner.card.suit === contract.strain,
    declaring: bridgeSideForSeat(winner.seat) === bridgeSideForSeat(contract.declarer) };
}

export function bridgeLearningRecap(tricks: CompletedHandTrick[], contract: BridgeContractState) {
  const decisive = tricks.findIndex((_, index) => {
    const counts = bridgeLearningCounts(tricks.slice(0, index + 1), contract);
    return counts.needed === 0 || counts.defenders > 13 - contract.target;
  });
  return [...new Set([0, decisive, tricks.length - 1].filter(index => index >= 0 && index < tricks.length))]
    .map(index => ({ number: index + 1, trick: tricks[index], kind: index === decisive ? "contract" : index === 0 ? "opening" : "last" }));
}
