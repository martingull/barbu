import { get } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { advanceEuchreOpponents } from "../../domain/euchrePolicy";
import { legalEuchreCards } from "../../domain/euchreRules";
import { createEuchreSession, replayEuchreHand, transitionEuchreSession, type EuchreAction } from "../../domain/euchreSession";
import { createEuchreSaveStore, restoreEuchreSession, saveEuchreSession } from "../../persistence/euchreSave";

export function createEuchreFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({ ...options, defaultTab: "learn", store: createEuchreSaveStore(options.storage),
    create: seed => advanceEuchreOpponents(createEuchreSession(seed)),
    next: (session, seed) => advanceEuchreOpponents(transitionEuchreSession(session, { type: "next-hand", seed })),
    save: saveEuchreSession, restore: saved => advanceEuchreOpponents(restoreEuchreSession(saved)) });
  function act(action: EuchreAction) {
    feature.change(session => action.type === "next-trick" || session.hand.turn === 2
      ? advanceEuchreOpponents(transitionEuchreSession(session, action)) : session);
  }
  return { ...feature, act,
    select(cardId: string) {
      const hand = get(feature).session?.hand;
      if (!hand || hand.turn !== 2) return;
      const cards = hand.phase === "discard" ? hand.hands[2] : hand.phase === "playing" && hand.contract
        ? legalEuchreCards(hand.hands[2], hand.currentTrick, hand.contract.trump) : [];
      feature.selectCard(cardId, cards, id => act({ type: hand.phase === "discard" ? "discard" : "play-card", cardId: id }));
    },
    replay() { feature.change(session => advanceEuchreOpponents(replayEuchreHand(session))); }
  };
}
export type EuchreFeature = ReturnType<typeof createEuchreFeature>;
