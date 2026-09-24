import { get } from "svelte/store";
import type { Card, FullHandState } from "../lessonTypes";
import type { ReviewedHandEvent } from "../domain/reviewedHand";
import { createSavedSessionFeature, type SessionFeatureOptions } from "./savedSessionFeature";
export type { FeatureOptions, SessionFeatureState as MatchFeatureState } from "./savedSessionFeature";

type ReviewedSession = { fullHand: FullHandState; fullHandReviewTrickCount: number };
type MatchEvent = ReviewedHandEvent | { type: "replay" } | { type: "next-hand"; seed: number };

// Shared interaction for reviewed trick-taking matches, not a game-rules engine.
export function createReviewedMatchFeature<Session extends ReviewedSession, Saved>(options: SessionFeatureOptions<Session, Saved> & {
  transition: (session: Session, event: MatchEvent) => Session;
  complete: (session: Session) => boolean;
  canPlay?: (session: Session) => boolean;
  activeHand?: (session: Session) => { cards: Card[]; legalCardIds: string[] };
}) {
  const feature = createSavedSessionFeature({
    ...options,
    next: (session: Session, seed: number) => options.complete(session)
      ? options.create(seed) : options.transition(session, { type: "next-hand", seed })
  });
  function playable(session: Session) {
    return session.fullHand.status !== "complete" && !session.fullHandReviewTrickCount
      && !get(feature).dealing && (options.canPlay?.(session) ?? true);
  }
  function activeHand(session: Session) {
    return options.activeHand?.(session) ?? { cards: session.fullHand.playerHand, legalCardIds: session.fullHand.legalCardIds };
  }
  function play(cardId = get(feature).selectedCardId) {
    const { session } = get(feature);
    if (!session || !playable(session) || !activeHand(session).legalCardIds.includes(cardId)) return;
    feature.change(session => options.transition(session, { type: "play-card", cardId }));
  }
  return {
    ...feature, play,
    nextTrick: () => feature.change(session => options.transition(session, { type: "next-trick" })),
    replay: () => feature.change(session => options.transition(session, { type: "replay" })),
    select(cardId: string) {
      const { session } = get(feature);
      if (session && playable(session)) feature.selectCard(cardId, activeHand(session).cards, play);
    }
  };
}
