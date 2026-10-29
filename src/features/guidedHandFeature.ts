import { writable } from "svelte/store";

// Guided hands deliberately have no persistence or course-completion callbacks.
export function createGuidedHandFeature<Session, Event>(seed: number, adapter: {
  create: (seed: number) => Session;
  transition: (session: Session, event: Event) => Session;
  replay: (session: Session) => Session;
}) {
  let state = { session: adapter.create(seed), selectedCardId: "", error: "" };
  const store = writable(state);
  function change(update: (session: Session) => Session) {
    try { state = { session: update(state.session), selectedCardId: "", error: "" }; }
    catch (error) { state = { ...state, error: error instanceof Error ? error.message : "Unable to play this card." }; }
    store.set(state);
  }
  return {
    subscribe: store.subscribe,
    select(id: string) { state = { ...state, selectedCardId: id, error: "" }; store.set(state); },
    dispatch(event: Event) { change(session => adapter.transition(session, event)); },
    replay() { change(adapter.replay); }
  };
}
