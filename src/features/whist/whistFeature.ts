import { writable } from "svelte/store";
import { createWhistSession, transitionWhistSession, whistSessionComplete, type WhistSession, type WhistSessionEvent } from "../../domain/whistSession";
import { createWhistSaveStore, restoreWhistSession, saveWhistSession, type SavedWhistRun } from "../../persistence/whistSave";
import type { SaveStorage } from "../../persistence/saveStore";
import type { WhistSessionMode } from "../../whistScoring";
import { whistDef } from "../../games/whist";

export type WhistFeatureState = {
  tab: "learn" | "play";
  view: "table" | "hand";
  mode: WhistSessionMode;
  session: WhistSession | null;
  saved: SavedWhistRun | null;
  selectedCardId: string;
  error: string;
  dealing: boolean;
};

export function createWhistFeature(options: {
  storage: () => SaveStorage | undefined;
  nextSeed: () => number;
  now?: () => number;
}) {
  const saveStore = createWhistSaveStore(options.storage);
  const now = options.now ?? Date.now;
  let state: WhistFeatureState = {
    tab: whistDef.table.defaultTab === "learn" ? "learn" : "play", view: "table", mode: "game", session: null,
    saved: saveStore.load(), selectedCardId: "", error: "", dealing: false
  };
  const store = writable(state);
  let lastTap = { cardId: "", at: 0 };

  function update(patch: Partial<WhistFeatureState>) {
    state = { ...state, ...patch };
    store.set(state);
  }

  function accept(session: WhistSession) {
    lastTap = { cardId: "", at: 0 };
    const saved = saveWhistSession(session, new Date(now()).toISOString());
    update({ session, saved, selectedCardId: "", error: "" });
    try { saveStore.write(saved); }
    catch { update({ error: "Progress could not be saved on this device." }); }
  }

  function dispatch(event: WhistSessionEvent) {
    if (!state.session || state.dealing) return;
    try {
      const next = transitionWhistSession(state.session, event);
      if (next !== state.session) accept(next);
    } catch (error) {
      update({ error: error instanceof Error ? error.message : "That card could not be played." });
    }
  }

  async function start(nextHand = false) {
    if (state.dealing) return;
    update({ dealing: true, error: "" });
    try {
      const session = nextHand && state.session && !whistSessionComplete(state.session)
        ? transitionWhistSession(state.session, { type: "next-hand", seed: options.nextSeed() })
        : createWhistSession(options.nextSeed(), state.mode);
      accept(session);
      update({ view: "hand", tab: "play" });
    } catch (error) {
      update({ error: error instanceof Error ? error.message : "The hand could not be dealt." });
    } finally {
      // Keep the deal guard through synchronous double taps and the UI update.
      await Promise.resolve();
      update({ dealing: false });
    }
  }

  function play(cardId = state.selectedCardId) {
    if (!state.session?.fullHand.legalCardIds.includes(cardId)) return;
    dispatch({ type: "play-card", cardId });
  }

  return {
    subscribe: store.subscribe,
    start,
    play,
    nextTrick: () => dispatch({ type: "next-trick" }),
    replay: () => dispatch({ type: "replay" }),
    setMode: (mode: WhistSessionMode) => update({ mode }),
    openTable(tab = state.tab) {
      lastTap = { cardId: "", at: 0 };
      update({ view: "table", tab, selectedCardId: "" });
    },
    resume() {
      const saved = state.saved ?? saveStore.load();
      if (!saved) return;
      accept(restoreWhistSession(saved));
      update({ view: "hand", tab: "play", mode: saved.mode });
    },
    select(cardId: string) {
      const hand = state.session?.fullHand;
      if (!hand || hand.status === "complete" || state.session?.fullHandReviewTrickCount || state.dealing
        || !hand.playerHand.some(card => card.id === cardId)) return;
      const at = now();
      const doubleTap = lastTap.cardId === cardId && at - lastTap.at < 450;
      lastTap = { cardId, at };
      update({ selectedCardId: cardId });
      if (doubleTap) play(cardId);
    }
  };
}

export type WhistFeature = ReturnType<typeof createWhistFeature>;
