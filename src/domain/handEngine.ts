import type { FullHandContract, FullHandState } from "../lessonTypes";
import { playBrowserWhistCard, replayWhistHand, startBrowserWhistHand } from "./trickTakingHand";

export type HandStartOptions = { seed: number; dealer?: number };
export type HandAction = { type: "play-card"; cardId: string } | { type: "replay" };

// No UI, storage or native calls. Transitions leave the previous state untouched.
export interface HandEngine {
  start(options: HandStartOptions): FullHandState;
  transition(state: FullHandState, action: HandAction): FullHandState;
}

export const whistHandEngine: HandEngine = {
  start: ({ seed, dealer }) => startBrowserWhistHand(seed, dealer),
  transition(state, action) {
    if (state.contract !== "Whist") throw new Error("Expected a Whist hand");
    return action.type === "replay" ? replayWhistHand(state) : playBrowserWhistCard(state, action.cardId);
  }
};

// Only migrated games belong here; the remaining native/fallback routes stay intact.
export function typescriptHandEngine(contract: FullHandContract): HandEngine | undefined {
  return contract === "Whist" ? whistHandEngine : undefined;
}
