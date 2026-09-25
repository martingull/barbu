import type { FullHandState, DominoHandState, FullHandContract } from "./types";
import { fullHandContracts } from "./contractRegistry";
import { contractRunScore } from "./contractScoring";
import { typescriptHandEngine } from "./handEngine";
import { dominoHandEngine } from "./dominoHand";
import { transitionReviewedHand, type ReviewedHandEvent } from "./reviewedHand";
import { emptySeatPenalties, seatPenaltiesForTricks, trickTakingSeats, type SeatScores } from "./trickTakingScore";

export type BarbuHandResult = {
  contract: FullHandContract; playerPenalty: number; totalPenalty: number; seatPenalties: SeatScores;
};
export type BarbuSession = {
  seed: number;
  view: "runContractIntro" | "fullHand" | "dominoHand";
  pendingContract: FullHandContract;
  results: BarbuHandResult[];
  fullHand: FullHandState | null;
  dominoHand: DominoHandState | null;
  fullHandReviewTrickCount: number;
};
export type BarbuSessionEvent = ReviewedHandEvent | { type: "pass" } | { type: "start-hand" }
  | { type: "next-contract" } | { type: "replay" };

export function createBarbuSession(seed: number): BarbuSession {
  if (!Number.isSafeInteger(seed) || seed < 1) throw new Error("Invalid Barbu seed");
  return { seed, view: "runContractIntro", pendingContract: fullHandContracts[0], results: [],
    fullHand: null, dominoHand: null, fullHandReviewTrickCount: 0 };
}

export function barbuSessionComplete(session: BarbuSession) {
  return fullHandContracts.every(contract => session.results.some(result => result.contract === contract));
}

export function barbuSeedForContract(seed: number, contract: FullHandContract) {
  return ((Math.imul(seed, 1_103_515_245) + Math.imul(fullHandContracts.indexOf(contract) + 1, 12_345)) >>> 0) || 1;
}

export function dominoSeatScores(hand: DominoHandState): SeatScores {
  return Object.fromEntries(trickTakingSeats.map((seat, index) => [seat, hand.scores[index] ?? 0])) as SeatScores;
}

export function barbuHandResult(hand: FullHandState | DominoHandState): BarbuHandResult {
  const seatPenalties = hand.contract === "Domino" ? dominoSeatScores(hand as DominoHandState)
    : seatPenaltiesForTricks((hand as FullHandState).completedTricks);
  return { contract: hand.contract, seatPenalties, playerPenalty: seatPenalties.You,
    totalPenalty: Object.values(seatPenalties).reduce((sum, points) => sum + points, 0) };
}

export function barbuSeatTotals(results: BarbuHandResult[], signed = true): SeatScores {
  const totals = emptySeatPenalties();
  for (const result of results) for (const seat of trickTakingSeats) {
    totals[seat] += signed ? contractRunScore(result.contract, result.seatPenalties[seat]) : result.seatPenalties[seat];
  }
  return totals;
}

// Record completion in the same transition as the last card, once per contract.
export function settleBarbuSession(session: BarbuSession): BarbuSession {
  const hand = session.view === "fullHand" ? session.fullHand : session.view === "dominoHand" ? session.dominoHand : null;
  if (!hand || hand.status !== "complete") return session;
  const result = barbuHandResult(hand);
  return { ...session, results: [...session.results.filter(item => item.contract !== hand.contract), result] };
}

export function transitionBarbuSession(session: BarbuSession, event: BarbuSessionEvent): BarbuSession {
  if (barbuSessionComplete(session)) return session;
  if (event.type === "start-hand") {
    if (session.view !== "runContractIntro") return session;
    const contract = session.pendingContract;
    const seed = barbuSeedForContract(session.seed, contract);
    return { ...session, view: contract === "Domino" ? "dominoHand" : "fullHand", fullHandReviewTrickCount: 0,
      fullHand: contract === "Domino" ? null : typescriptHandEngine(contract)!.start({ seed }),
      dominoHand: contract === "Domino" ? dominoHandEngine.start({ seed }) : null };
  }
  const hand = session.view === "fullHand" ? session.fullHand : session.view === "dominoHand" ? session.dominoHand : null;
  if (!hand) return session;
  if (event.type === "next-contract") {
    if (hand.status !== "complete") return session;
    const settled = settleBarbuSession(session);
    if (barbuSessionComplete(settled)) return settled;
    const index = fullHandContracts.indexOf(hand.contract);
    const pendingContract = Array.from({ length: fullHandContracts.length }, (_, offset) => fullHandContracts[(index + offset + 1) % fullHandContracts.length])
      .find(contract => !settled.results.some(result => result.contract === contract))!;
    return { ...settled, pendingContract, view: "runContractIntro", fullHand: null, dominoHand: null, fullHandReviewTrickCount: 0 };
  }
  let next = session;
  if (session.view === "dominoHand" && session.dominoHand) {
    if (event.type === "next-trick") return session;
    const dominoHand = dominoHandEngine.transition(session.dominoHand, event);
    if (dominoHand === session.dominoHand) return session;
    next = { ...session, dominoHand };
  } else if (session.fullHand) {
    const engine = typescriptHandEngine(session.fullHand.contract)!;
    if (event.type === "pass") return session;
    next = event.type === "replay"
      ? { ...session, fullHand: engine.transition(session.fullHand, event), fullHandReviewTrickCount: 0 }
      : transitionReviewedHand({ ...session, fullHand: session.fullHand }, event, engine);
    if (next.fullHand === session.fullHand && next.fullHandReviewTrickCount === session.fullHandReviewTrickCount) return session;
  }
  if (event.type === "replay") next = { ...next, results: next.results.filter(result => result.contract !== hand.contract) };
  return next === session ? session : settleBarbuSession(next);
}
