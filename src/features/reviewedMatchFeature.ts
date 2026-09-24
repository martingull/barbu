import { writable } from "svelte/store";
import type { FullHandState } from "../lessonTypes";
import type { ReviewedHandEvent } from "../domain/reviewedHand";
import type { SaveStorage } from "../persistence/saveStore";

export type FeatureOptions = { storage: () => SaveStorage | undefined; nextSeed: () => number; now?: () => number };
type ReviewedSession = { fullHand: FullHandState; fullHandReviewTrickCount: number };
type MatchEvent = ReviewedHandEvent | { type: "replay" } | { type: "next-hand"; seed: number };
export type MatchFeatureState<Session, Saved> = {
  tab: "learn" | "play"; view: "table" | "hand"; session: Session | null;
  saved: Saved | null; selectedCardId: string; error: string; dealing: boolean;
};

// Shared interaction for reviewed trick-taking matches, not a game-rules engine.
export function createReviewedMatchFeature<Session extends ReviewedSession, Saved>(options: {
  nextSeed: () => number; now?: () => number; defaultTab: string;
  store: { load: () => Saved | null; write: (saved: Saved | null) => void };
  create: (seed: number) => Session;
  transition: (session: Session, event: MatchEvent) => Session;
  complete: (session: Session) => boolean;
  save: (session: Session, at: string) => Saved | null;
  restore: (saved: Saved) => Session;
  canPlay?: (session: Session) => boolean;
}) {
  const now = options.now ?? Date.now;
  let state: MatchFeatureState<Session, Saved> = {
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
    if (!state.session || state.dealing) return;
    try {
      const next = transition(state.session);
      if (next !== state.session) accept(next);
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That action could not be completed." }); }
  }
  async function start(nextHand = false) {
    if (state.dealing) return;
    update({ dealing: true, error: "" });
    try {
      accept(nextHand && state.session && !options.complete(state.session)
        ? options.transition(state.session, { type: "next-hand", seed: options.nextSeed() })
        : options.create(options.nextSeed()));
      update({ view: "hand", tab: "play" });
    } catch (cause) { update({ error: cause instanceof Error ? cause.message : "That hand could not be dealt." }); }
    finally {
      // Retain the guard through synchronous double taps and the UI update.
      await Promise.resolve();
      update({ dealing: false });
    }
  }
  function playable(session: Session) {
    return session.fullHand.status !== "complete" && !session.fullHandReviewTrickCount
      && !state.dealing && (options.canPlay?.(session) ?? true);
  }
  function play(cardId = state.selectedCardId) {
    if (!state.session || !playable(state.session) || !state.session.fullHand.legalCardIds.includes(cardId)) return;
    change(session => options.transition(session, { type: "play-card", cardId }));
  }
  return {
    subscribe: store.subscribe, start, play, change,
    reportError: (error: string) => update({ error }),
    nextTrick: () => change(session => options.transition(session, { type: "next-trick" })),
    replay: () => change(session => options.transition(session, { type: "replay" })),
    openTable(tab = state.tab) { lastTap = { id: "", at: 0 }; update({ view: "table", tab, selectedCardId: "" }); },
    resume() {
      const saved = state.saved ?? options.store.load();
      if (!saved) return;
      accept(options.restore(saved));
      update({ view: "hand", tab: "play" });
    },
    select(cardId: string) {
      if (!state.session || !playable(state.session) || !state.session.fullHand.playerHand.some(card => card.id === cardId)) return;
      const at = now();
      const doubleTap = lastTap.id === cardId && at - lastTap.at < 450;
      lastTap = { id: cardId, at };
      update({ selectedCardId: cardId });
      if (doubleTap) play(cardId);
    }
  };
}
