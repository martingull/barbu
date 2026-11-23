import { get, writable } from "svelte/store";
import { createSavedSessionFeature, type FeatureOptions } from "../savedSessionFeature";
import { createGinSession, replayGinHand, transitionGinSession, type GinAction } from "../../domain/ginRummySession";
import { advanceGinOpponent } from "../../domain/ginRummyPolicy";
import { createGinSaveStore, restoreGinSession, saveGinSession } from "../../persistence/ginRummySave";
import { createSaveStore } from "../../persistence/saveStore";
import { defaultGinSettings, isGinSettings, type GinSettings } from "../../domain/ginRummyRules";

export const ginSettingsKey = "barbu.ginSettings.v1";

export function createGinRummyFeature(options: FeatureOptions) {
  const preference = createSaveStore(ginSettingsKey, value => isGinSettings(value) ? { profile: value.profile } : null, options.storage);
  const settings = writable(preference.load() ?? { ...defaultGinSettings });
  const feature = createSavedSessionFeature({ ...options, defaultTab: "play", store: createGinSaveStore(options.storage),
    create: seed => advanceGinOpponent(createGinSession(seed, get(settings))),
    next: (session, seed) => advanceGinOpponent(transitionGinSession(session, { type: "next", seed })),
    save: saveGinSession, restore: saved => advanceGinOpponent(restoreGinSession(saved)) });
  return { ...feature,
    settings,
    selectSettings(value: GinSettings) {
      if (!isGinSettings(value) || get(feature).view !== "table") return;
      const selected = { profile: value.profile };
      settings.set(selected);
      try { preference.write(selected); }
      catch { feature.reportError("Scoring selected, but the preference could not be saved."); }
    },
    select(cardId: string) { const session = get(feature).session; if (session) feature.focusCard(cardId, session.hand.hands[0]); },
    act(action: GinAction) { feature.change(session => {
      if (session.hand.turn !== 0) return session;
      return advanceGinOpponent(transitionGinSession(session, action));
    }); },
    replay() { feature.change(session => advanceGinOpponent(replayGinHand(session))); }
  };
}
export type GinRummyFeature = ReturnType<typeof createGinRummyFeature>;
