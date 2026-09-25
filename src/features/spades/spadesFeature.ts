import { createReviewedMatchFeature, type FeatureOptions } from "../reviewedMatchFeature";
import { createSpadesSession, transitionSpadesSession, spadesSessionComplete } from "../../domain/spadesSession";
import { createSpadesSaveStore, saveSpadesSession, restoreSpadesSession } from "../../persistence/spadesSave";
import { spadesDef } from "../../games/spades";

export function createSpadesFeature(options: FeatureOptions) {
  const feature = createReviewedMatchFeature({
    ...options, defaultTab: spadesDef.table.defaultTab, store: createSpadesSaveStore(options.storage),
    create: createSpadesSession, transition: transitionSpadesSession, complete: spadesSessionComplete,
    save: saveSpadesSession, restore: restoreSpadesSession, canPlay: session => session.playStarted
  });
  return {
    ...feature,
    setBid: (bid: number) => feature.change(session => transitionSpadesSession(session, { type: "set-bid", bid })),
    toggleBids: () => feature.change(session => transitionSpadesSession(session, { type: "toggle-bids" })),
    startPlay: () => feature.change(session => transitionSpadesSession(session, { type: "start-play" }))
  };
}
export type SpadesFeature = ReturnType<typeof createSpadesFeature>;
