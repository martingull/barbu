import { writable } from "svelte/store";
import type { Card } from "../lessonTypes";
import type { SaveStorage } from "../persistence/saveStore";

export type FeatureOptions = { storage: () => SaveStorage | undefined; nextSeed: () => number; now?: () => number };
export type SessionFeatureState<Session, Saved> = {
  tab: "learn" | "play"; view: "table" | "hand"; session: Session | null;
  saved: Saved | null; selectedCardId: string; error: string; dealing: boolean;
};

export type SessionFeatureOptions<Session, Saved> = {
  nextSeed: () => number; now?: () => number; defaultTab: string;
  store: { load: () => Saved | null; write: (saved: Saved | null) => void };
  create: (seed: number) => Session;
  next?: (session: Session, seed: number) => Session;
  save: (session: Session, at: string) => Saved | null;
  restore: (saved: Saved) => Session;
};

// Save and navigation plumbing shared by matches and multi-contract sessions.
export function createSavedSessionFeature<Session, Saved>(options: SessionFeatureOptions<Session, Saved>) {
  const now = options.now ?? Date.now;
  let state: SessionFeatureState<Session, Saved> = {
    tab: options.defaultTab === "learn" ? "learn" : "play", view: "table", session: null,
    saved: options.store.load(), selectedCardId: "", error: "", dealing: false
  };
  const store = writable(state);
  let lastTap = { id: "", at: 0 };
  function update(patch: Partial<typeof state>) { state = { ...state, ...patch }; store.set(state); }
  function accept(session: Session) {
    lastTap = { id: "", at: 0 };
    const saved = options.save(session, new Date(now()).toISOString());
    update({ session, saved, selectedCardId: "", error: "" });
    try { options.store.write(saved); }
    catch { update({ error: "Progress could not be saved on this device." }); }
  }
  function change(transition: (session: Session) => Session) {
    if (!state.session || state.dealing) return false;
    try {
      const next = transition(state.session);
      if (next === state.session) return false;
      accept(next);
      return true;
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That action could not be completed." }); return false; }
  }
  async function start(nextHand = false) {
    if (state.dealing) return;
    update({ dealing: true, error: "" });
    try {
      accept(nextHand && state.session && options.next
        ? options.next(state.session, options.nextSeed())
        : options.create(options.nextSeed()));
      update({ view: "hand", tab: "play" });
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That hand could not be dealt." }); }
    finally {
      // Retain the guard through synchronous double taps and the UI update.
      await Promise.resolve();
      update({ dealing: false });
    }
  }
  function focusCard(cardId: string, cards: Card[]) {
    if (cards.some(card => card.id === cardId)) update({ selectedCardId: cardId });
  }
  return {
    subscribe: store.subscribe, start, change, focusCard,
    reportError: (error: string) => update({ error }),
    openTable(tab = state.tab) { lastTap = { id: "", at: 0 }; update({ view: "table", tab, selectedCardId: "" }); },
    resume() {
      const saved = state.saved ?? options.store.load();
      if (!saved) return;
      accept(options.restore(saved));
      update({ view: "hand", tab: "play" });
    },
    selectCard(cardId: string, cards: Card[], onDoubleTap: (cardId: string) => void) {
      if (!cards.some(card => card.id === cardId)) return;
      const at = now();
      const doubleTap = lastTap.id === cardId && at - lastTap.at < 450;
      lastTap = { id: cardId, at };
      update({ selectedCardId: cardId });
      if (doubleTap) onDoubleTap(cardId);
    }
  };
}
