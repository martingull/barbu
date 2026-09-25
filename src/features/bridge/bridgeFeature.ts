import { get } from "svelte/store";
import { createReviewedMatchFeature, type FeatureOptions } from "../reviewedMatchFeature";
import { createBridgeSession, transitionBridgeSession } from "../../domain/bridgeSession";
import { createBridgeSaveStore, saveBridgeSession, restoreBridgeSession } from "../../persistence/bridgeSave";
import { bridgeAuctionStatus, type BridgeCallOption } from "../../domain/bridgeAuction";
import { bridgeDef } from "../../games/bridge";
import { bridgeActiveHand, bridgeDealerIndex } from "./bridgePresentation";

export function createBridgeFeature(options: FeatureOptions) {
  const feature = createReviewedMatchFeature({
    ...options, defaultTab: bridgeDef.table.defaultTab, store: createBridgeSaveStore(options.storage),
    create: createBridgeSession, transition: transitionBridgeSession, complete: () => false,
    save: saveBridgeSession, restore: restoreBridgeSession,
    canPlay: session => session.view === "fullHand", activeHand: session => bridgeActiveHand(session.fullHand)
  });
  return {
    ...feature,
    selectCall: (call: BridgeCallOption) => feature.change(session => transitionBridgeSession(session, { type: "select-call", call })),
    confirmAuction() {
      const session = get(feature).session;
      if (!session || session.view !== "bridgeAuction") return;
      const status = bridgeAuctionStatus(session.auctionCalls, bridgeDealerIndex(session.fullHand));
      if (status.passedOut) return feature.start(true);
      feature.change(current => transitionBridgeSession(current, { type: status.complete ? "start-play" : "make-call" }));
    }
  };
}
export type BridgeFeature = ReturnType<typeof createBridgeFeature>;
