import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { createCanastaSession, replayCanastaHand, transitionCanastaSession, type CanastaAction } from "../../domain/canastaSession";
import { advanceCanastaOpponents } from "../../domain/canastaPolicy";
import { createCanastaSaveStore, saveCanastaSession, restoreCanastaSession } from "../../persistence/canastaSave";

export function createCanastaFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({ ...options, defaultTab: "play", store: createCanastaSaveStore(options.storage),
    create: seed => advanceCanastaOpponents(createCanastaSession(seed)),
    next: (session, seed) => advanceCanastaOpponents(transitionCanastaSession(session, { type: "next", seed })),
    save: saveCanastaSession, restore: saved => advanceCanastaOpponents(restoreCanastaSession(saved)) });
  return { ...feature,
    act(action: CanastaAction) { return feature.change(session => session.hand.turn === 0
      ? advanceCanastaOpponents(transitionCanastaSession(session, action)) : session); },
    replay() { feature.change(session => advanceCanastaOpponents(replayCanastaHand(session))); }
  };
}
export type CanastaFeature = ReturnType<typeof createCanastaFeature>;
