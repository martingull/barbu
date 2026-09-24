import type { Card, Seat, FullHandState, BridgeAuctionCall, BridgeContractState, BridgeVulnerability, CompletedHandTrick } from "../../lessonTypes";
import { compassSeatLabels, formatCardLabel } from "../../cardDisplay";
import { displaySuitSequence } from "../../cardOrdering";
import { bridgeSuitCount } from "../../bridgeBidding";
import { bridgeCallLongLabel, bridgeSideForSeat, type BridgeCallOption } from "../../domain/bridgeAuction";
import { bridgeHandResultFor, type BridgeScoreState } from "../../domain/bridgeScoring";
import { trickTakingSeats } from "../../domain/trickTakingScore";
import { formatSignedScore } from "../../scorePresentation";
import type { SavedBridgeRun } from "../../persistence/bridgeSave";

export const bridgeSeatLabel = (seat: Seat | "Unknown") => seat === "Unknown" ? seat : compassSeatLabels[seat];

export function bridgeActiveHand(hand: FullHandState) {
  const dummySeat = hand.bridgeContract?.dummy ?? "Tutor";
  const declarerSeat = hand.bridgeContract?.declarer ?? "You";
  const declares = bridgeSideForSeat(declarerSeat) === "NS";
  const isDummyTurn = declares && hand.currentPlayer === dummySeat;
  return { dummySeat, declarerSeat, declares, isDummyTurn,
    cards: isDummyTurn ? hand.dummyHand ?? [] : hand.playerHand,
    legalCardIds: isDummyTurn ? hand.dummyLegalCardIds ?? [] : hand.legalCardIds };
}

export function bridgeAuctionSummary(calls: BridgeAuctionCall[]) {
  return calls.length
    ? calls.map((call) => `${bridgeSeatLabel(call.seat)} ${bridgeCallLongLabel(call.call as BridgeCallOption)}`).join(", ")
    : "No auction recorded";
}


export function bridgeOpeningLeadSummary(hand: FullHandState, contract: BridgeContractState) {
  const openingLead = hand?.completedTricks[0]?.cards[0];
  if (!openingLead) {
    const leader = contract.openingLeader ?? trickTakingSeats[(trickTakingSeats.indexOf(contract.declarer) + 1) % 4];
    return `${bridgeSeatLabel(leader)} is on opening lead.`;
  }

  return `${bridgeSeatLabel(openingLead.seat)} led ${formatCardLabel(openingLead.card)}.`;
}


export function bridgeHandShapeLabel(cards: Card[]) {
  return displaySuitSequence.map((suit) => bridgeSuitCount(cards, suit)).join("-");
}


export function bridgeDealerSeat(hand: FullHandState | null): Seat {
  return hand?.bridgeDealer ?? "You";
}


export function bridgeDealerIndex(hand: FullHandState | null) {
  return trickTakingSeats.indexOf(bridgeDealerSeat(hand));
}


export function bridgeVulnerabilityForHand(hand: FullHandState | null): BridgeVulnerability {
  return hand?.bridgeVulnerability ?? "None";
}


export function bridgePartnershipLabel(side: "NS" | "EW") {
  return side === "NS" ? "North-South" : "East-West";
}


export function savedBridgeRunSummary(savedRun: SavedBridgeRun) {
  const handNumber = savedRun.fullHand.bridgeBoardNumber ?? savedRun.results.length + 1;
  const score = `NS ${formatSignedScore(savedRun.scores.ns)}, EW ${formatSignedScore(savedRun.scores.ew)}`;
  const finalContract = savedRun.fullHand.bridgeContract?.label;

  if (savedRun.view === "bridgeAuction") {
    return `Board ${handNumber}, auction in progress, ${score}`;
  }

  return savedRun.fullHand.status === "complete"
    ? `Board ${handNumber} complete, ${score}`
    : `Board ${handNumber}, ${finalContract ?? "contract"}, trick ${savedRun.fullHand.trickNumber}, ${score}`;
}


export function bridgeReviewFeedback(trick: CompletedHandTrick, contract: BridgeContractState) {
  return trick.winnerIndex % 2 === trickTakingSeats.indexOf(contract.declarer) % 2
    ? `${bridgeSeatLabel(trick.winner)} won for declarer. Count that toward the ${contract.target} tricks needed for ${contract.label}.`
    : `${bridgeSeatLabel(trick.winner)} won for the defense. Protect entries and look for the next sure trick.`;
}

export function bridgeResultCopy(hand: FullHandState, scores: BridgeScoreState) {
  const contract = hand.bridgeContract;
  const result = bridgeHandResultFor(hand, hand.bridgeBoardNumber ?? 1);
  if (!contract || !result) return { heading: "", summary: "" };
  return {
    heading: `${contract.label} ${result.made ? "made" : "defeated"}`,
    summary: `Auction: ${bridgeAuctionSummary(hand.bridgeAuction ?? [])}. Contract: ${contract.label} by ${bridgeSeatLabel(contract.declarer)}; ${bridgeSeatLabel(contract.dummy)} was dummy. ${bridgeOpeningLeadSummary(hand, contract)} Declarer side won ${result.tricks} tricks; defenders won ${result.defenders}. ${result.made ? `Contract made for ${formatSignedScore(result.score)}.` : `Declarer needed ${contract.target} tricks, so the defense defeated the contract.`} Duplicate score: NS ${formatSignedScore(scores.ns)}, EW ${formatSignedScore(scores.ew)}.`
  };
}
