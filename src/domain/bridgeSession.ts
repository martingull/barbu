import type { BridgeAuctionCall, FullHandState } from "./types";
import { bridgeAuctionStatus, bridgeAutoAdvanceAuction, bridgeCallLabel, bridgeFinalizeContract,
  bridgeLegalCallOptions, bridgeSuggestedCallForHand, type BridgeCallOption } from "./bridgeAuction";
import { bridgeHandResultFor, bridgeScoreTotalsWith, type BridgeHandResult, type BridgeScoreState } from "./bridgeScoring";
import { bridgeHandEngine } from "./handEngine";
import { applyBrowserBridgeAuction } from "./trickTakingHand";
import { trickTakingSeats as seats } from "./trickTakingScore";
import { transitionReviewedHand, type ReviewedHandEvent } from "./reviewedHand";

export type BridgeSession = {
  view: "bridgeAuction" | "fullHand";
  scores: BridgeScoreState;
  results: BridgeHandResult[];
  fullHand: FullHandState;
  auctionCalls: BridgeAuctionCall[];
  selectedCall: BridgeCallOption;
  fullHandReviewTrickCount: number;
};
export type BridgeSessionEvent = ReviewedHandEvent
  | { type: "select-call"; call: BridgeCallOption } | { type: "make-call" } | { type: "start-play" }
  | { type: "replay" } | { type: "next-hand"; seed: number };

export function createBridgeSession(seed: number, boardNumber = 1): BridgeSession {
  const fullHand = bridgeHandEngine.start({ seed, boardNumber });
  const auctionCalls = bridgeAutoAdvanceAuction([], fullHand);
  return { view: "bridgeAuction", scores: { ns: 0, ew: 0 }, results: [], fullHand, auctionCalls,
    selectedCall: bridgeSuggestedCallForHand(fullHand, auctionCalls), fullHandReviewTrickCount: 0 };
}

export function bridgeSessionSettlement(session: BridgeSession) {
  const result = session.view === "fullHand" && session.fullHand.status === "complete"
    ? bridgeHandResultFor(session.fullHand, session.fullHand.bridgeBoardNumber ?? session.results.length + 1) : null;
  return { result, scores: bridgeScoreTotalsWith(result, session.scores) };
}

export function transitionBridgeSession(session: BridgeSession, event: BridgeSessionEvent): BridgeSession {
  const hand = session.fullHand;
  const dealer = seats.indexOf(hand.bridgeDealer ?? "You");
  const status = bridgeAuctionStatus(session.auctionCalls, dealer);
  switch (event.type) {
    case "select-call":
      return session.view === "bridgeAuction" && bridgeLegalCallOptions(session.auctionCalls, "You", dealer).includes(event.call)
        ? { ...session, selectedCall: event.call } : session;
    case "make-call": {
      if (session.view !== "bridgeAuction" || !bridgeLegalCallOptions(session.auctionCalls, "You", dealer).includes(session.selectedCall)) return session;
      const auctionCalls = bridgeAutoAdvanceAuction([...session.auctionCalls,
        { seat: "You", call: bridgeCallLabel(session.selectedCall) }], hand);
      return { ...session, auctionCalls, selectedCall: bridgeSuggestedCallForHand(hand, auctionCalls) };
    }
    case "start-play": {
      if (session.view !== "bridgeAuction" || !status.complete || status.passedOut) return session;
      const contract = bridgeFinalizeContract(session.auctionCalls, hand);
      return contract ? { ...session, view: "fullHand",
        fullHand: applyBrowserBridgeAuction(hand, contract, session.auctionCalls), fullHandReviewTrickCount: 0 } : session;
    }
    case "play-card":
    case "next-trick":
      return session.view === "fullHand" ? transitionReviewedHand(session, event, bridgeHandEngine) : session;
    case "replay":
      return session.view === "fullHand" ? { ...session, fullHand: bridgeHandEngine.transition(hand, event),
        fullHandReviewTrickCount: 0 } : session;
    case "next-hand": {
      const settlement = bridgeSessionSettlement(session);
      const boardNumber = hand.bridgeBoardNumber ?? session.results.length + 1;
      const result: BridgeHandResult | null = session.view === "bridgeAuction" && status.passedOut
        ? { passedOut: true, handNumber: boardNumber, contract: "Passed out", declarer: null, declarerSide: null,
            vulnerability: hand.bridgeVulnerability ?? "None", target: 0, tricks: 0, defenders: 0, score: 0, made: false }
        : settlement.result;
      if (!result) return session;
      return { ...createBridgeSession(event.seed, boardNumber + 1), scores: settlement.scores,
        results: [...session.results, result] };
    }
  }
}
