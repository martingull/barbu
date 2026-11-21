import { get, writable } from "svelte/store";
import { createReviewedMatchFeature, type FeatureOptions } from "../reviewedMatchFeature";
import { createBridgeSession, transitionBridgeSession } from "../../domain/bridgeSession";
import { createBridgeSaveStore, saveBridgeSession, restoreBridgeSession } from "../../persistence/bridgeSave";
import { bridgeAuctionStatus, type BridgeCallOption } from "../../domain/bridgeAuction";
import { bridgeDef } from "../../games/bridge";
import { bridgeActiveHand, bridgeDealerIndex } from "./bridgePresentation";
import { createSaveStore } from "../../persistence/saveStore";
import { defaultBridgeSystem, isBridgeSystem, type BridgeBiddingSystemId } from "../../domain/bridgeSystems";

export function createBridgeFeature(options: FeatureOptions) {
  const preference = createSaveStore("barbu.bridgeBiddingSystem.v1", value => isBridgeSystem(value) ? value : null, options.storage);
  const biddingSystem = writable(preference.load() ?? defaultBridgeSystem);
  const feature = createReviewedMatchFeature({
    ...options, defaultTab: bridgeDef.table.defaultTab, store: createBridgeSaveStore(options.storage),
    create: seed => createBridgeSession(seed, 1, get(biddingSystem)), transition: transitionBridgeSession, complete: () => false,
    save: saveBridgeSession, restore: restoreBridgeSession,
    canPlay: session => session.view === "fullHand", activeHand: session => bridgeActiveHand(session.fullHand)
  });
  return {
    ...feature,
    biddingSystem,
    selectSystem(system: BridgeBiddingSystemId) {
      if (!isBridgeSystem(system) || get(feature).view !== "table") return;
      biddingSystem.set(system);
      try { preference.write(system); }
      catch { feature.reportError("Bidding system selected, but the preference could not be saved."); }
    },
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
