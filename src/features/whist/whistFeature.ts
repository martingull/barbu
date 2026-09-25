import { derived, get, writable } from "svelte/store";
import { createReviewedMatchFeature, type FeatureOptions } from "../reviewedMatchFeature";
import { createWhistSession, transitionWhistSession, whistSessionComplete } from "../../domain/whistSession";
import { createWhistSaveStore, restoreWhistSession, saveWhistSession } from "../../persistence/whistSave";
import type { WhistSessionMode } from "../../domain/whistScoring";
import { whistDef } from "../../games/whist";

export function createWhistFeature(options: FeatureOptions) {
  const mode = writable<WhistSessionMode>("game");
  const feature = createReviewedMatchFeature({
    ...options, defaultTab: whistDef.table.defaultTab, store: createWhistSaveStore(options.storage),
    create: seed => createWhistSession(seed, get(mode)), transition: transitionWhistSession, complete: whistSessionComplete,
    save: saveWhistSession, restore: restoreWhistSession
  });
  const state = derived([feature, mode], ([match, mode]) => ({ ...match, mode }));
  return {
    ...feature, subscribe: state.subscribe, setMode: mode.set,
    resume() {
      feature.resume();
      const session = get(feature).session;
      if (session) mode.set(session.mode);
    }
  };
}
export type WhistFeature = ReturnType<typeof createWhistFeature>;
