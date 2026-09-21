import type { BridgeContractState, BridgeVulnerability, FullHandState, Seat } from "../lessonTypes";
import { trickTakingSeats as seats } from "./trickTakingScore";
import { bridgeSideForSeat } from "./bridgeAuction";

export type BridgeHandResult = {
  passedOut?: boolean;
  handNumber: number;
  contract: string;
  declarer: Seat | null;
  declarerSide: "NS" | "EW" | null;
  vulnerability: BridgeVulnerability;
  target: number;
  tricks: number;
  defenders: number;
  score: number;
  made: boolean;
};

export type BridgeScoreState = {
  ns: number;
  ew: number;
};

export function bridgeDeclarerTrickCounts(hand: FullHandState | null) {
  const contract = hand?.bridgeContract;
  if (!hand || !contract) {
    return { declarer: 0, defenders: 0 };
  }

  const declarerSide = seats.indexOf(contract.declarer) % 2;

  return hand.completedTricks.reduce(
    (totals, trick) => ({
      declarer: totals.declarer + (trick.winnerIndex % 2 === declarerSide ? 1 : 0),
      defenders: totals.defenders + (trick.winnerIndex % 2 === declarerSide ? 0 : 1)
    }),
    { declarer: 0, defenders: 0 }
  );
}

export function bridgeHandResultFor(hand: FullHandState, handNumber = hand.bridgeBoardNumber ?? 1): BridgeHandResult | null {
  const contract = hand.bridgeContract;
  if (!contract) {
    return null;
  }

  const counts = bridgeDeclarerTrickCounts(hand);
  const score = bridgeDuplicateScore(contract, counts.declarer);

  return {
    handNumber,
    contract: contract.label,
    declarer: contract.declarer,
    declarerSide: contract.declarerSide ?? bridgeSideForSeat(contract.declarer),
    vulnerability: contract.vulnerability,
    target: contract.target,
    tricks: counts.declarer,
    defenders: counts.defenders,
    score,
    made: counts.declarer >= contract.target
  };
}

export function bridgeScoreTotalsWith(result: BridgeHandResult | null, scores: BridgeScoreState) {
  if (!result || result.passedOut) {
    return scores;
  }

  return {
    ns: scores.ns + (result.declarerSide === "NS" ? result.score : -result.score),
    ew: scores.ew + (result.declarerSide === "EW" ? result.score : -result.score)
  };
}

function bridgeContractTrickPoints(contract: BridgeContractState) {
  const base = contract.strain === "C" || contract.strain === "D" ? 20 : 30;
  const noTrumpBonus = contract.strain === "NT" ? 10 : 0;
  const undoubled = contract.level * base + noTrumpBonus;

  return undoubled * (contract.redoubled ? 4 : contract.doubled ? 2 : 1);
}

function bridgeOvertrickPoints(contract: BridgeContractState, overtricks: number) {
  if (overtricks <= 0) {
    return 0;
  }

  const vulnerable = bridgeContractIsVulnerable(contract);

  if (contract.redoubled) {
    return overtricks * (vulnerable ? 400 : 200);
  }
  if (contract.doubled) {
    return overtricks * (vulnerable ? 200 : 100);
  }

  return overtricks * (contract.strain === "C" || contract.strain === "D" ? 20 : 30);
}

function bridgeUndertrickPenalty(contract: BridgeContractState, undertricks: number) {
  if (undertricks <= 0) {
    return 0;
  }

  const vulnerable = bridgeContractIsVulnerable(contract);

  if (!contract.doubled && !contract.redoubled) {
    return undertricks * (vulnerable ? 100 : 50);
  }

  const doubledPenalty = Array.from({ length: undertricks }, (_, index) => {
    if (vulnerable) {
      return index === 0 ? 200 : 300;
    }

    if (index === 0) return 100;
    if (index <= 2) return 200;
    return 300;
  }).reduce((total, value) => total + value, 0);

  return contract.redoubled ? doubledPenalty * 2 : doubledPenalty;
}

function bridgeContractIsVulnerable(contract: BridgeContractState) {
  return contract.vulnerability === "Both" || contract.vulnerability === (contract.declarerSide ?? bridgeSideForSeat(contract.declarer));
}

export function bridgeDuplicateScore(contract: BridgeContractState, declarerTricks: number) {
  const overtricks = declarerTricks - contract.target;

  if (overtricks < 0) {
    return -bridgeUndertrickPenalty(contract, Math.abs(overtricks));
  }

  const contractPoints = bridgeContractTrickPoints(contract);
  const gameBonus = contractPoints >= 100 ? (bridgeContractIsVulnerable(contract) ? 500 : 300) : 50;
  const slamBonus = contract.level === 6 ? (bridgeContractIsVulnerable(contract) ? 750 : 500) : contract.level === 7 ? (bridgeContractIsVulnerable(contract) ? 1500 : 1000) : 0;
  const insult = contract.redoubled ? 100 : contract.doubled ? 50 : 0;

  return contractPoints + gameBonus + slamBonus + insult + bridgeOvertrickPoints(contract, overtricks);
}
