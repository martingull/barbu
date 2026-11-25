import { get } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { createBeloteSession, transitionBeloteSession, replayBeloteHand, type BeloteAction } from "../../domain/beloteSession";
import { advanceBeloteOpponents } from "../../domain/belotePolicy";
import { legalBeloteCards } from "../../domain/beloteRules";
import { createBeloteSaveStore, saveBeloteSession, restoreBeloteSession } from "../../persistence/beloteSave";

export function createBeloteFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({ ...options, defaultTab: "learn", store: createBeloteSaveStore(options.storage),
    create: seed => advanceBeloteOpponents(createBeloteSession(seed)),
    next: (session, seed) => advanceBeloteOpponents(transitionBeloteSession(session, { type: "next-hand", seed })),
    save: saveBeloteSession, restore: saved => advanceBeloteOpponents(restoreBeloteSession(saved)) });
  function act(action: BeloteAction) {
    feature.change(session => action.type === "next-trick" || session.hand.turn === 2
      ? advanceBeloteOpponents(transitionBeloteSession(session, action)) : session);
  }
  return { ...feature, act,
    select(cardId: string) {
      const hand = get(feature).session?.hand;
      if (!hand || hand.phase !== "playing" || !hand.contract || hand.turn !== 2) return;
      feature.selectCard(cardId, legalBeloteCards(hand.hands[2], hand.currentTrick, hand.contract.trump, 2), id => act({ type: "play-card", cardId: id }));
    }, replay() { feature.change(session => advanceBeloteOpponents(replayBeloteHand(session))); }
  };
}
export type BeloteFeature = ReturnType<typeof createBeloteFeature>;
