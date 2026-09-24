import { writable } from "svelte/store";
import { createHeartsSession, transitionHeartsSession, heartsSessionSettlement, type HeartsSession, type HeartsSessionEvent } from "../../domain/heartsSession";
import { createHeartsSaveStore, restoreHeartsSession, saveHeartsSession, type SavedHeartsRun } from "../../persistence/heartsSave";
import type { SaveStorage } from "../../persistence/saveStore";
import { heartsDef } from "../../games/hearts";

export type HeartsFeatureState = {
  tab: "learn" | "play"; view: "table" | "hand"; session: HeartsSession | null;
  saved: SavedHeartsRun | null; selectedCardId: string; error: string; dealing: boolean;
};

export function createHeartsFeature(options: { storage: () => SaveStorage | undefined; nextSeed: () => number; now?: () => number }) {
  const saveStore = createHeartsSaveStore(options.storage);
  const now = options.now ?? Date.now;
  let state: HeartsFeatureState = { tab: heartsDef.table.defaultTab === "learn" ? "learn" : "play",
    view: "table", session: null, saved: saveStore.load(), selectedCardId: "", error: "", dealing: false };
  const store = writable(state);
  let lastTap = { id: "", at: 0 };
  function update(patch: Partial<HeartsFeatureState>) { state = { ...state, ...patch }; store.set(state); }
  function accept(session: HeartsSession) {
    lastTap = { id: "", at: 0 };
    const saved = saveHeartsSession(session, new Date(now()).toISOString());
    update({ session, saved, selectedCardId: "", error: "" });
    try { saveStore.write(saved); }
    catch { update({ error: "Progress could not be saved on this device." }); }
  }
  function dispatch(event: HeartsSessionEvent) {
    if (!state.session || state.dealing) return;
    try {
      const next = transitionHeartsSession(state.session, event);
      if (next !== state.session) accept(next);
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That action could not be completed." }); }
  }
  async function start(nextHand = false) {
    if (state.dealing) return;
    update({ dealing: true, error: "" });
    try {
      accept(nextHand && state.session && !heartsSessionSettlement(state.session).complete
        ? transitionHeartsSession(state.session, { type: "next-hand", seed: options.nextSeed() })
        : createHeartsSession(options.nextSeed()));
      update({ view: "hand", tab: "play" });
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That hand could not be dealt." }); }
    finally { await Promise.resolve(); update({ dealing: false }); }
  }
  function play(cardId = state.selectedCardId) {
    if (state.session?.phase !== "playing" || !state.session.fullHand.legalCardIds.includes(cardId)) return;
    dispatch({ type: "play-card", cardId });
  }
  return {
    subscribe: store.subscribe, start, play,
    nextTrick: () => dispatch({ type: "next-trick" }), replay: () => dispatch({ type: "replay" }),
    openTable(tab = state.tab) { lastTap = { id: "", at: 0 }; update({ view: "table", tab, selectedCardId: "" }); },
    resume() {
      const saved = state.saved ?? saveStore.load();
      if (!saved) return;
      accept(restoreHeartsSession(saved));
      update({ view: "hand", tab: "play" });
    },
    selectPass(cardId: string) {
      if (state.session?.phase !== "passing") return;
      const ids = state.session.selectedPassCardIds;
      if (ids.length >= 3 && !ids.includes(cardId)) { update({ error: "Remove one card before choosing another." }); return; }
      dispatch({ type: "select-pass", cardId });
    },
    pass() {
      if (state.session?.phase !== "passing") return;
      if (state.session.selectedPassCardIds.length !== 3) { update({ error: "Choose exactly three cards to pass." }); return; }
      dispatch({ type: "pass" });
    },
    select(cardId: string) {
      const session = state.session;
      if (!session || session.phase !== "playing" || session.fullHand.status === "complete" || state.dealing
        || session.fullHandReviewTrickCount || !session.fullHand.playerHand.some(card => card.id === cardId)) return;
      const at = now();
      const doubleTap = lastTap.id === cardId && at - lastTap.at < 450;
      lastTap = { id: cardId, at };
      update({ selectedCardId: cardId });
      if (doubleTap) play(cardId);
    }
  };
}
export type HeartsFeature = ReturnType<typeof createHeartsFeature>;
