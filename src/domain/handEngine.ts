import type { FullHandContract, FullHandState, Seat } from "./types";
import { barbuTrickContracts } from "./barbuRules";
import { startBarbuHand, playBarbuCard, replayBarbuHand } from "./trickTakingHand";
import { applyBrowserHeartsPass, playBrowserHeartsCard, replayHeartsHand, startBrowserHeartsHand, startBrowserHeartsPassingHand,
  playBrowserWhistCard, replayWhistHand, startBrowserWhistHand,
  playBrowserSpadesCard, replaySpadesHand, startBrowserSpadesHand, startSpadesBiddingHand, beginSpadesHand,
  playBrowserBridgeCard, replayBridgeHand, startBrowserBridgeHand } from "./trickTakingHand";

export type HandStartOptions = { seed: number; dealer?: number; boardNumber?: number };
export type HandAction = { type: "play-card"; cardId: string } | { type: "replay" };

// No UI, storage or native calls. Transitions leave the previous state untouched.
export interface HandEngine {
  start(options: HandStartOptions): FullHandState;
  transition(state: FullHandState, action: HandAction): FullHandState;
}

function createHandEngine(contract: FullHandContract, start: HandEngine["start"],
  play: (state: FullHandState, cardId: string) => FullHandState,
  replay: (state: FullHandState) => FullHandState): HandEngine {
  return { start, transition(state, action) {
    if (state.contract !== contract) throw new Error(`Expected a ${contract} hand`);
    return action.type === "replay" ? replay(state) : play(state, action.cardId);
  } };
}

export const whistHandEngine = createHandEngine("Whist",
  ({ seed, dealer }) => startBrowserWhistHand(seed, dealer), playBrowserWhistCard, replayWhistHand);

export const heartsHandEngine = {
  ...createHandEngine("Hearts", ({ seed }) => startBrowserHeartsHand(seed), playBrowserHeartsCard, replayHeartsHand),
  startPassing: startBrowserHeartsPassingHand,
  pass(state: FullHandState, cardIds: string[], direction: number) {
    if (state.contract !== "Hearts") throw new Error("Expected a Hearts hand");
    if (cardIds.length !== 3 || !Number.isInteger(direction)) return state;
    return applyBrowserHeartsPass(state, cardIds, direction);
  }
};

export const spadesHandEngine = {
  ...createHandEngine("Spades", ({ seed }) => startBrowserSpadesHand(seed), playBrowserSpadesCard, replaySpadesHand),
  startBidding: startSpadesBiddingHand,
  begin(state: FullHandState, bids: Record<Seat, number>) {
    if (state.contract !== "Spades") throw new Error("Expected a Spades hand");
    return beginSpadesHand(state, bids);
  }
};

export const bridgeHandEngine = createHandEngine("Bridge",
  ({ seed, boardNumber }) => startBrowserBridgeHand(seed, boardNumber), playBrowserBridgeCard, replayBridgeHand);

const engines: Partial<Record<FullHandContract, HandEngine>> = {
  ...Object.fromEntries(barbuTrickContracts.map(contract => [contract,
    createHandEngine(contract, ({ seed }) => startBarbuHand(contract, seed), playBarbuCard, replayBarbuHand)])),
  Whist: whistHandEngine, Hearts: heartsHandEngine, Spades: spadesHandEngine, Bridge: bridgeHandEngine
};

// Domino has a layout engine rather than a trick-taking hand.
export function typescriptHandEngine(contract: FullHandContract): HandEngine | undefined {
  return engines[contract];
}
