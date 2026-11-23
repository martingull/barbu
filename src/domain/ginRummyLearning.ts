import type { Card } from "./types";
import { standardDeck } from "./deck";
import { bestMeldLayout } from "./rummyMelds";
import { advanceGinOpponent } from "./ginRummyPolicy";
import { createGinSession, transitionGinSession, type GinAction, type GinSession } from "./ginRummySession";

type PlayerAction = Exclude<GinAction, { type: "next" }>;

export function createGinLearningTurn(cards: Card[], upcard: Card, stockCard: Card): GinSession {
  const deck = standardDeck(), visible = [...cards, upcard, stockCard];
  if (cards.length !== 10 || new Set(visible.map(card => card.id)).size !== 12 ||
    visible.some(card => !deck.some(item => item.id === card.id && item.rank === card.rank && item.suit === card.suit))) {
    throw Error("A Gin turn needs ten cards and two distinct draw cards.");
  }
  const remaining = deck.filter(card => !visible.some(item => item.id === card.id));
  const session = createGinSession(1);
  return { ...session, hand: { ...session.hand, phase: "draw", turn: 0,
    hands: [[...cards], remaining.slice(0, 10)], stock: [stockCard, ...remaining.slice(10)], discards: [upcard] } };
}

export type GinGuidedEvent = PlayerAction | { type: "continue" };
export type GinGuidedMoment = {
  action: PlayerAction; card?: Card; before: number; after: number;
};
export type GinGuidedSession = { session: GinSession; review: GinGuidedMoment | null; moments: GinGuidedMoment[] };

export function createGinGuidedSession(seed: number): GinGuidedSession {
  return { session: advanceGinOpponent(createGinSession(seed)), review: null, moments: [] };
}

export function transitionGinGuidedSession(state: GinGuidedSession, event: GinGuidedEvent): GinGuidedSession {
  if (event.type === "continue") return state.review ? { ...state, review: null } : state;
  if (state.review || state.session.hand.phase === "complete") return state;
  if (state.session.hand.turn !== 0) throw Error("Wait for your turn.");
  const before = state.session.hand.hands[0];
  const played = transitionGinSession(state.session, event);
  const after = played.hand.hands[0];
  const moment: GinGuidedMoment = {
    action: event,
    card: event.type === "discard" ? before.find(card => card.id === event.cardId)
      : event.type === "draw" ? after.find(card => !before.some(previous => previous.id === card.id)) : state.session.hand.discards.at(-1),
    before: bestMeldLayout(before).points, after: bestMeldLayout(after).points
  };
  const session = advanceGinOpponent(played);
  return { session, review: session.hand.phase === "complete" ? null : moment, moments: [...state.moments, moment] };
}

export function replayGinGuidedSession(state: GinGuidedSession) {
  return createGinGuidedSession(state.session.initialSeed);
}

export function ginGuidedRecap(moments: GinGuidedMoment[]) {
  if (!moments.length) return [];
  // Opening choice, largest discard improvement, and last choice, in play order.
  const discards = moments.filter(moment => moment.action.type === "discard");
  const improvement = discards.reduce<GinGuidedMoment | undefined>((best, moment) =>
    !best || moment.before - moment.after > best.before - best.after ? moment : best, undefined);
  const selected = new Set([moments[0], improvement, moments.at(-1)]);
  return moments.flatMap((moment, index) => selected.has(moment) ? [{ moment, decision: index + 1 }] : []);
}
