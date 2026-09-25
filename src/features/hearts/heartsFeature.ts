import { get } from "svelte/store";
import { createReviewedMatchFeature, type FeatureOptions } from "../reviewedMatchFeature";
import { createHeartsSession, transitionHeartsSession, heartsSessionSettlement } from "../../domain/heartsSession";
import { createHeartsSaveStore, restoreHeartsSession, saveHeartsSession } from "../../persistence/heartsSave";
import { heartsDef } from "../../games/hearts";

export function createHeartsFeature(options: FeatureOptions) {
  const feature = createReviewedMatchFeature({
    ...options, defaultTab: heartsDef.table.defaultTab, store: createHeartsSaveStore(options.storage),
    create: createHeartsSession, transition: transitionHeartsSession, complete: session => heartsSessionSettlement(session).complete,
    save: saveHeartsSession, restore: restoreHeartsSession, canPlay: session => session.phase === "playing"
  });
  return {
    ...feature,
    selectPass(cardId: string) {
      const session = get(feature).session;
      if (session?.phase !== "passing") return;
      const ids = session.selectedPassCardIds;
      if (ids.length >= 3 && !ids.includes(cardId)) { feature.reportError("Remove one card before choosing another."); return; }
      feature.change(session => transitionHeartsSession(session, { type: "select-pass", cardId }));
    },
    pass() {
      const session = get(feature).session;
      if (session?.phase !== "passing") return;
      if (session.selectedPassCardIds.length !== 3) { feature.reportError("Choose exactly three cards to pass."); return; }
      feature.change(session => transitionHeartsSession(session, { type: "pass" }));
    }
  };
}
export type HeartsFeature = ReturnType<typeof createHeartsFeature>;
