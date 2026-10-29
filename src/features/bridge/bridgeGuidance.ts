import { bridgeLearningCounts, bridgeLearningTrick, type BridgeLearningPosition } from "../../domain/bridgeLearning";
import { bridgeSideForSeat } from "../../domain/bridgeAuction";
import { trickWinner } from "../../domain/trickTakingRules";
import type { BridgeContractState, CompletedHandTrick, Suit } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { bridgeSeatLabel } from "./bridgePresentation";

const suitName = (suit: Suit) => ({ C: "clubs", D: "diamonds", H: "hearts", S: "spades" })[suit];
export function bridgeGuidance(position: BridgeLearningPosition) {
  const { contract, currentTrick, activeHand, currentPlayer } = position;
  const led = currentTrick[0]?.card.suit;
  const role = currentPlayer === contract.dummy ? "dummy" : currentPlayer === contract.declarer ? "declarer" : "defender";
  const rule = `${bridgeSeatLabel(currentPlayer)} (${role}) plays. ${!led ? "Lead any card."
    : activeHand.some(card => card.suit === led) ? `Follow ${suitName(led)} from this hand.`
    : `This hand has no ${suitName(led)}; any card is legal. You do not have to trump.`}`;
  const counts = bridgeLearningCounts(position.completedTricks, contract);
  const trump = contract.strain === "NT" ? null : contract.strain;
  const winning = trickWinner(currentTrick, trump);
  const partnerWinning = winning && currentPlayer !== "Unknown" && bridgeSideForSeat(winning.seat) === bridgeSideForSeat(currentPlayer);
  let tip = partnerWinning ? "Your partnership is ahead in this trick. Consider saving strength; players still to act may change the winner."
    : currentTrick.length === 3 ? "You play last. Look for the cheapest winner; if none can win, preserve useful cards."
    : role === "defender" ? position.dummyHand ? "Support partner's lead and use dummy's exposed cards to judge which honours are still missing."
      : "Dummy is still hidden. Consider the auction and your own suit lengths when choosing the opening lead."
    : "Count likely winners in your hand and dummy, and preserve entries between them. A finesse offers a chance, not a guaranteed trick.";
  if (contract.dummy === "You") tip = "North declares and plays automatically at this table; you choose South dummy's cards. In club play, declarer directs dummy. Follow suit from South; North's hand remains hidden.";
  else if (role === "dummy") tip = "As declarer, choose from dummy's hand now, not your own. " + tip;
  tip += ` ${contract.strain === "NT" ? "No suit is trump." : `${suitName(contract.strain)} are trump.`} Declarer has ${counts.declarer}/${contract.target} tricks; defense needs ${14 - contract.target} to defeat the contract.`;
  return { rule, tip };
}

export function bridgeGuidedReview(tricks: CompletedHandTrick[], contract: BridgeContractState) {
  const last = tricks.at(-1);
  const facts = last && bridgeLearningTrick(last, contract);
  if (!facts) return null;
  const counts = bridgeLearningCounts(tricks, contract);
  return {
    winning: `${bridgeSeatLabel(facts.winner.seat)} wins with ${formatCardLabel(facts.winner.card)}, the highest ${facts.trumped ? "trump" : "card of the led suit"}.`,
    scoring: `${facts.declaring ? "Declarer" : "Defense"} takes the trick. Declarer: ${counts.declarer}/${contract.target}; defense: ${counts.defenders}. ${counts.defenders > 13 - contract.target ? "The defense has defeated the contract." : counts.needed ? `${counts.needed} more needed by declarer.` : "The contract target is reached."}`,
    next: tricks.length === 13 ? "All 13 tricks are complete. The final score also depends on the contract, doubles and vulnerability."
      : `${bridgeSeatLabel(facts.winner.seat)} leads next.`
  };
}
