import type { FullHandState, Seat } from "./types";
import { heartsHandEngine } from "./handEngine";
import { transitionReviewedHand, type ReviewedHandEvent } from "./reviewedHand";
import { addSeatPenalties, emptySeatPenalties, seatPenaltiesForTricks, trickTakingSeats, type SeatScores } from "./trickTakingScore";

export const heartsHandPenaltyTotal = 26;
export const heartsMatchTarget = 100;
export type HeartsPassDirection = "left" | "right" | "across" | "hold";
export type HeartsHandResult = { handNumber: number; seatPenalties: SeatScores; moonShooter?: Seat };
export type HeartsSession = {
  phase: "passing" | "playing";
  passDirection: HeartsPassDirection;
  scores: SeatScores;
  results: HeartsHandResult[];
  fullHand: FullHandState;
  fullHandReviewTrickCount: number;
  selectedPassCardIds: string[];
};
export type HeartsSessionEvent = ReviewedHandEvent
  | { type: "select-pass"; cardId: string }
  | { type: "pass" }
  | { type: "replay" }
  | { type: "next-hand"; seed: number };

export function heartsMoonShooter(points: SeatScores) {
  return trickTakingSeats.reduce((sum, seat) => sum + points[seat], 0) === heartsHandPenaltyTotal
    ? trickTakingSeats.find(seat => points[seat] === heartsHandPenaltyTotal) : undefined;
}

export function heartsScoredSeatPenalties(points: SeatScores): SeatScores {
  const shooter = heartsMoonShooter(points);
  if (!shooter) return points;
  const scores = emptySeatPenalties();
  for (const seat of trickTakingSeats) scores[seat] = seat === shooter ? 0 : heartsHandPenaltyTotal;
  return scores;
}

export function heartsPassDirectionForHand(handNumber: number): HeartsPassDirection {
  return (["left", "right", "across", "hold"] as const)[(Math.max(1, handNumber) - 1) % 4];
}

function deal(seed: number, handNumber: number) {
  const passDirection = heartsPassDirectionForHand(handNumber);
  return { passDirection, phase: passDirection === "hold" ? "playing" as const : "passing" as const,
    fullHand: passDirection === "hold" ? heartsHandEngine.start({ seed }) : heartsHandEngine.startPassing(seed),
    fullHandReviewTrickCount: 0, selectedPassCardIds: [] as string[] };
}

export function createHeartsSession(seed: number): HeartsSession {
  return { ...deal(seed, 1), scores: emptySeatPenalties(), results: [] };
}

export function heartsSessionSettlement(session: HeartsSession) {
  const raw = session.phase === "playing" ? seatPenaltiesForTricks(session.fullHand.completedTricks) : emptySeatPenalties();
  const points = heartsScoredSeatPenalties(raw);
  const scores = addSeatPenalties(session.scores, points);
  const handComplete = session.phase === "playing" && session.fullHand.status === "complete";
  const result: HeartsHandResult | null = handComplete ? {
    handNumber: session.results.length + 1, seatPenalties: points, moonShooter: heartsMoonShooter(raw)
  } : null;
  return { scores, result, complete: handComplete && Math.max(...Object.values(scores)) >= heartsMatchTarget };
}

export function transitionHeartsSession(session: HeartsSession, event: HeartsSessionEvent): HeartsSession {
  switch (event.type) {
    case "select-pass": {
      if (session.phase !== "passing" || !session.fullHand.hands[2].some(card => card.id === event.cardId)) return session;
      const selected = session.selectedPassCardIds;
      if (selected.includes(event.cardId)) return { ...session, selectedPassCardIds: selected.filter(id => id !== event.cardId) };
      return selected.length < 3 ? { ...session, selectedPassCardIds: [...selected, event.cardId] } : session;
    }
    case "pass": {
      if (session.phase !== "passing" || session.passDirection === "hold") return session;
      const direction = session.passDirection === "right" ? 3 : session.passDirection === "across" ? 2 : 1;
      const fullHand = heartsHandEngine.pass(session.fullHand, session.selectedPassCardIds, direction);
      return fullHand === session.fullHand ? session : { ...session, phase: "playing", fullHand, selectedPassCardIds: [] };
    }
    case "play-card":
    case "next-trick":
      return session.phase === "playing" ? transitionReviewedHand(session, event, heartsHandEngine) : session;
    case "replay":
      if (session.phase !== "playing" || heartsSessionSettlement(session).complete) return session;
      return { ...session, fullHand: heartsHandEngine.transition(session.fullHand, event), fullHandReviewTrickCount: 0 };
    case "next-hand": {
      const settlement = heartsSessionSettlement(session);
      if (!settlement.result || settlement.complete) return session;
      return { ...session, ...deal(event.seed, session.results.length + 2), scores: settlement.scores,
        results: [...session.results, settlement.result] };
    }
  }
}
