import { derived, get, writable } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { createBarbuSession, transitionBarbuSession, type BarbuSessionEvent } from "../../domain/barbuSession";
import { createBarbuSaveStore, restoreBarbuSession, saveBarbuSession } from "../../persistence/barbuSave";
import { dominoMoveExplanation } from "./barbuPresentation";

export function createBarbuFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({
    ...options, defaultTab: "play", store: createBarbuSaveStore(options.storage),
    create: createBarbuSession, save: saveBarbuSession, restore: restoreBarbuSession
  });
  const lastMoveReason = writable("");
  const state = derived([feature, lastMoveReason], ([state, lastMoveReason]) => ({ ...state, lastMoveReason }));
  function dispatch(event: BarbuSessionEvent, reason = "") {
    if (feature.change(session => transitionBarbuSession(session, event))) lastMoveReason.set(reason);
  }
  function playableHand() {
    const { session, dealing } = get(feature);
    if (!session || dealing || session.fullHandReviewTrickCount) return null;
    const hand = session.fullHand ?? session.dominoHand;
    return hand?.status === "in_progress" ? hand : null;
  }
  function play(cardId = get(feature).selectedCardId) {
    const hand = playableHand();
    if (!hand?.legalCardIds.includes(cardId)) return;
    const domino = get(feature).session?.dominoHand;
    dispatch({ type: "play-card", cardId }, domino
      ? dominoMoveExplanation(domino, domino.playerHand.find(card => card.id === cardId)) : "");
  }
  return {
    subscribe: state.subscribe,
    async start() { lastMoveReason.set(""); await feature.start(); },
    resume() { lastMoveReason.set(""); feature.resume(); },
    openTable: feature.openTable,
    startHand: () => dispatch({ type: "start-hand" }),
    nextContract: () => dispatch({ type: "next-contract" }),
    nextTrick: () => dispatch({ type: "next-trick" }),
    replay: () => dispatch({ type: "replay" }),
    play,
    select(cardId: string) {
      const hand = playableHand();
      if (hand) feature.selectCard(cardId, hand.playerHand, play);
    },
    focus(cardId: string) {
      const hand = playableHand();
      if (hand) feature.focusCard(cardId, hand.playerHand);
    },
    place() {
      const hand = playableHand();
      if (!hand) return;
      const selected = get(feature).selectedCardId;
      play(hand.legalCardIds.includes(selected) ? selected
        : hand.playerHand.find(card => hand.legalCardIds.includes(card.id))?.id);
    },
    pass() { dispatch({ type: "pass" }, "You passed because no card in your hand could start or extend a lane."); }
  };
}
export type BarbuFeature = ReturnType<typeof createBarbuFeature>;
