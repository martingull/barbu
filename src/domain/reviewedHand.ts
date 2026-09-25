import type { FullHandState } from "./types";
import type { HandEngine } from "./handEngine";

export type ReviewedHand = { fullHand: FullHandState; fullHandReviewTrickCount: number };
export type ReviewedHandEvent = { type: "play-card"; cardId: string } | { type: "next-trick" };

export function transitionReviewedHand<T extends ReviewedHand>(session: T, event: ReviewedHandEvent, engine: HandEngine): T {
  if (event.type === "next-trick") {
    return session.fullHandReviewTrickCount > 0 ? { ...session, fullHandReviewTrickCount: 0 } : session;
  }
  const hand = session.fullHand;
  if (session.fullHandReviewTrickCount > 0 || hand.status === "complete") return session;
  const next = engine.transition(hand, event);
  if (next === hand) return session;
  return { ...session, fullHand: next,
    fullHandReviewTrickCount: next.status === "in_progress" && next.completedTricks.length > hand.completedTricks.length
      ? next.completedTricks.length : 0 };
}
