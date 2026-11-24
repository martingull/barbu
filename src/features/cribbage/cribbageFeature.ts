import { get, writable } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { advanceCribbageOpponent, createCribbageSession, cribbageCards, cribbageLegalCards, transitionCribbageSession, type CribbageAction } from "../../domain/cribbage";
import { createCribbageSaveStore, saveCribbageSession, restoreCribbageSession } from "../../persistence/cribbageSave";

export function createCribbageFeature(options: FeatureOptions) {
  const feature = createSavedSessionFeature({ ...options, defaultTab: "learn", store: createCribbageSaveStore(options.storage),
    create: seed => advanceCribbageOpponent(createCribbageSession(seed)), save: saveCribbageSession,
    restore: saved => advanceCribbageOpponent(restoreCribbageSession(saved)) });
  const discards = writable<string[]>([]);
  function act(action: CribbageAction) {
    const session = get(feature).session;
    if (!session || action.type !== "continue" && session.game.toPlay !== session.player) return;
    if (feature.change(current => advanceCribbageOpponent(transitionCribbageSession(current, action)))) discards.set([]);
  }
  return { ...feature, discards, act,
    select(id: string) {
      const session = get(feature).session;
      if (!session || !cribbageLegalCards(session).includes(id)) return;
      if (session.game.phase === "crib") discards.update(ids => ids.includes(id) ? ids.filter(card => card !== id) : ids.length < 2 ? [...ids, id] : ids);
      else feature.selectCard(id, cribbageCards(session.game.hands[session.player]), card => act({ type: "play", card }));
    },
    async start() { discards.set([]); await feature.start(); },
    resume() { discards.set([]); feature.resume(); }
  };
}
export type CribbageFeature = ReturnType<typeof createCribbageFeature>;
