import { get } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { createGinSession, replayGinHand, transitionGinSession, type GinAction } from "../../domain/ginRummySession";
import { advanceGinOpponent } from "../../domain/ginRummyPolicy";
import { createGinSaveStore, restoreGinSession, saveGinSession } from "../../persistence/ginRummySave";

export function createGinRummyFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({ ...options, defaultTab: "play", store: createGinSaveStore(options.storage),
    create: seed => advanceGinOpponent(createGinSession(seed)),
    next: (session, seed) => advanceGinOpponent(transitionGinSession(session, { type: "next", seed })),
    save: saveGinSession, restore: saved => advanceGinOpponent(restoreGinSession(saved)) });
  return { ...feature,
    select(cardId: string) { const session = get(feature).session; if (session) feature.focusCard(cardId, session.hand.hands[0]); },
    act(action: GinAction) { feature.change(session => {
      if (session.hand.turn !== 0) return session;
      return advanceGinOpponent(transitionGinSession(session, action));
    }); },
    replay() { feature.change(session => advanceGinOpponent(replayGinHand(session))); }
  };
}
export type GinRummyFeature = ReturnType<typeof createGinRummyFeature>;
