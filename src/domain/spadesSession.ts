import type { FullHandState } from "../lessonTypes";
import { addSpadesMatchResult, spadesHandResultFor, spadesMatchComplete, type SpadesHandResult, type SpadesScoreState } from "../spadesScoring";
import { spadesClampBid, suggestedSpadesBidsForHand, type SpadesBidState } from "./spadesBidding";
import { spadesHandEngine } from "./handEngine";
import { transitionReviewedHand, type ReviewedHandEvent } from "./reviewedHand";

export type SpadesSession = {
  scores: SpadesScoreState;
  bags: SpadesScoreState;
  bids: SpadesBidState;
  results: SpadesHandResult[];
  fullHand: FullHandState;
  fullHandReviewTrickCount: number;
  playStarted: boolean;
  openingPanel: "table" | "bid";
};
export type SpadesSessionEvent = ReviewedHandEvent
  | { type: "set-bid"; bid: number } | { type: "toggle-bids" } | { type: "start-play" }
  | { type: "replay" } | { type: "next-hand"; seed: number };

export function createSpadesSession(seed: number): SpadesSession {
  const fullHand = spadesHandEngine.startBidding(seed);
  return { scores: { playerSide: 0, opponentSide: 0 }, bags: { playerSide: 0, opponentSide: 0 },
    bids: suggestedSpadesBidsForHand(fullHand), results: [], fullHand, fullHandReviewTrickCount: 0,
    playStarted: false, openingPanel: "table" };
}
export function spadesSessionSettlement(session: SpadesSession) {
  const result = session.fullHand.status === "complete"
    ? spadesHandResultFor(session.fullHand, session.results.length + 1, session.bids, session.bags) : null;
  return { result, ...(result ? addSpadesMatchResult(session.scores, session.bags, result)
    : { scores: session.scores, bags: session.bags }) };
}
export function spadesSessionComplete(session: SpadesSession) {
  return session.fullHand.status === "complete" && spadesMatchComplete(spadesSessionSettlement(session).scores);
}
export function transitionSpadesSession(session: SpadesSession, event: SpadesSessionEvent): SpadesSession {
  switch (event.type) {
    case "set-bid":
      return session.playStarted ? session : { ...session, bids: { ...session.bids, You: spadesClampBid(event.bid) } };
    case "toggle-bids":
      return session.playStarted ? session : { ...session, openingPanel: session.openingPanel === "bid" ? "table" : "bid" };
    case "start-play":
      return session.playStarted ? session : { ...session, playStarted: true, openingPanel: "table",
        fullHand: spadesHandEngine.begin(session.fullHand, session.bids) };
    case "play-card":
    case "next-trick":
      return session.playStarted ? transitionReviewedHand(session, event, spadesHandEngine) : session;
    case "replay":
      return !session.playStarted || spadesSessionComplete(session) ? session : { ...session,
        fullHand: spadesHandEngine.transition(session.fullHand, event), fullHandReviewTrickCount: 0 };
    case "next-hand": {
      if (session.fullHand.status !== "complete" || spadesSessionComplete(session)) return session;
      const settlement = spadesSessionSettlement(session);
      return { ...createSpadesSession(event.seed), scores: settlement.scores, bags: settlement.bags,
        results: [...session.results, settlement.result!] };
    }
  }
}
