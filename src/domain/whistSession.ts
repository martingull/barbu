import type { FullHandState, Suit } from "./types";
import { settleWhistHand, whistOddTricksForSide, type WhistPartnershipTricks, type WhistSessionMode } from "./whistScoring";
import { whistHandEngine } from "./handEngine";
import { transitionReviewedHand, type ReviewedHandEvent } from "./reviewedHand";

export type WhistHandResult = {
  handNumber: number;
  trumpSuit: Suit;
  playerSideOddTricks: number;
  opponentSideOddTricks: number;
};

export type WhistSession = {
  mode: WhistSessionMode;
  scores: WhistPartnershipTricks;
  games: WhistPartnershipTricks;
  results: WhistHandResult[];
  fullHand: FullHandState;
  fullHandReviewTrickCount: number;
};

export type WhistSessionEvent =
  | ReviewedHandEvent
  | { type: "replay" }
  | { type: "next-hand"; seed: number };

export const emptyWhistScore = (): WhistPartnershipTricks => ({ playerSide: 0, opponentSide: 0 });

export function createWhistSession(seed: number, mode: WhistSessionMode = "game"): WhistSession {
  return { mode, scores: emptyWhistScore(), games: emptyWhistScore(), results: [],
    fullHand: whistHandEngine.start({ seed }), fullHandReviewTrickCount: 0 };
}

export function whistHandResultFor(hand: FullHandState, handNumber: number): WhistHandResult {
  const playerTricks = hand.completedTricks.filter(trick => trick.winnerIndex % 2 === 0).length;
  const suffix = hand.id.split("-").at(-1);
  const trumpSuit = hand.trumpSuit ?? hand.whistTurnedTrump?.suit
    ?? (suffix === "C" || suffix === "D" || suffix === "H" ? suffix : "S");
  return { handNumber, trumpSuit,
    playerSideOddTricks: whistOddTricksForSide(playerTricks),
    opponentSideOddTricks: whistOddTricksForSide(hand.completedTricks.length - playerTricks) };
}

export function whistSessionSettlement(session: Pick<WhistSession, "scores" | "games" | "mode"> & { fullHand: FullHandState | null }) {
  const result = session.fullHand?.status === "complete" ? whistHandResultFor(session.fullHand, 1) : null;
  return settleWhistHand(session.scores, session.games, {
    playerSide: result?.playerSideOddTricks ?? 0,
    opponentSide: result?.opponentSideOddTricks ?? 0
  }, session.mode);
}

export function whistSessionComplete(session: WhistSession) {
  return session.fullHand.status === "complete" && whistSessionSettlement(session).complete;
}

export function transitionWhistSession(session: WhistSession, event: WhistSessionEvent): WhistSession {
  const hand = session.fullHand;
  switch (event.type) {
    case "play-card":
    case "next-trick":
      return transitionReviewedHand(session, event, whistHandEngine);
    case "replay":
      if (hand.status === "complete" && whistSessionSettlement(session).gameComplete) return session;
      return { ...session, fullHand: whistHandEngine.transition(hand, event), fullHandReviewTrickCount: 0 };
    case "next-hand": {
      if (hand.status !== "complete") return session;
      const settlement = whistSessionSettlement(session);
      if (settlement.complete) return session;
      const previousDealer = hand.whistDealer ?? Number(hand.id.match(/-dealer-([0-3])-/)?.[1]);
      const dealer = Number.isInteger(previousDealer) ? (previousDealer + 1) % 4 : undefined;
      // Construct the new hand before applying settlement; a failed deal changes nothing.
      const next = whistHandEngine.start({ seed: event.seed, dealer });
      return { ...session, scores: settlement.nextScores, games: settlement.games,
        results: [...session.results, whistHandResultFor(hand, session.results.length + 1)],
        fullHand: next, fullHandReviewTrickCount: 0 };
    }
  }
}
