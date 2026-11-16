import type { Card } from "./types";
import { advanceCanastaOpponents, canastaObservation, canastaPickupAction } from "./canastaPolicy";
import { completedCanastas, initialCanastaMinimum, canastaValue } from "./canastaRules";
import { createCanastaSession, transitionCanastaSession, canastaNeedsThrees, legalCanastaDiscards,
  type CanastaAction, type CanastaSession } from "./canastaSession";

type PlayerAction = Exclude<CanastaAction, { type: "next" }>;
export type CanastaGuidedEvent = PlayerAction | { type: "continue" };
export type CanastaGuidedMoment = {
  action: PlayerAction; cards: Card[]; before: number; after: number;
  canastasBefore: number; canastasAfter: number; opened: boolean; pileCount: number;
};
export type CanastaGuidedSession = { session: CanastaSession; review: CanastaGuidedMoment | null; moments: CanastaGuidedMoment[] };

export function createCanastaGuidedSession(seed: number): CanastaGuidedSession {
  return { session: advanceCanastaOpponents(createCanastaSession(seed)), review: null, moments: [] };
}

export function transitionCanastaGuidedSession(state: CanastaGuidedSession, event: CanastaGuidedEvent): CanastaGuidedSession {
  if (event.type === "continue") return state.review ? { ...state, review: null } : state;
  if (state.review || state.session.hand.phase === "complete") return state;
  if (state.session.hand.turn !== 0) throw Error("Wait for your turn.");
  const before = state.session.hand;
  const played = transitionCanastaSession(state.session, event), after = played.hand;
  const visible = event.type === "draw" || event.type === "expose"
    ? after.hands[0].filter(card => !before.hands[0].some(old => old.id === card.id))
    : before.hands[0].filter(card => !after.hands[0].some(next => next.id === card.id));
  const moment: CanastaGuidedMoment = {
    action: played.events.at(-1) as PlayerAction, cards: visible, before: before.hands[0].length, after: after.hands[0].length,
    canastasBefore: completedCanastas(before.sides[0]), canastasAfter: completedCanastas(after.sides[0]),
    opened: !before.sides[0].opened && after.sides[0].opened, pileCount: before.discards.length
  };
  const session = advanceCanastaOpponents(played);
  return { session, review: session.hand.phase === "complete" ? null : moment, moments: [...state.moments, moment] };
}

export function replayCanastaGuidedSession(state: CanastaGuidedSession) {
  return createCanastaGuidedSession(state.session.initialSeed);
}

// Guidance receives the same public-only projection as the opponent, never the deal.
export function canastaGuidance(observation: ReturnType<typeof canastaObservation>, selectedId = "") {
  const hand = observation.hand, cards = hand.hands[0], side = hand.sides[0];
  const selected = cards.find(card => card.id === selectedId);
  const minimum = initialCanastaMinimum(observation.scores[0]);
  const facts = `${completedCanastas(side)} of 2 canastas to go out. ${side.opened ? "Your partnership has opened." : `Opening minimum: ${minimum} points.`}`;
  if (canastaNeedsThrees(hand)) return { facts, rule: "Expose your threes and take replacement cards before continuing.",
    tip: "Before opening you may retain one three for a special straight; threes are never ordinary discards." };
  if (hand.phase === "draw") return { facts,
    rule: "Draw one stock card, or take the discard pile with a matching natural pair and a qualifying opening.",
    tip: canastaPickupAction(observation) ? "A legal pickup is available. The pile can help build melds, but adds cards you may be left holding."
      : "Draw from stock, or inspect Take pile to check an opening. A matching pair alone does not always qualify." };
  if (selected) return { facts,
    rule: legalCanastaDiscards(hand).some(card => card.id === selected.id)
      ? `This is a legal discard, worth ${canastaValue(selected)} card points. Discarding ends your turn.`
      : "This card cannot be discarded now. Check threes, wilds, empty-pile restrictions and the two-canasta requirement.",
    tip: "Look at the opponents' public melds before discarding. Their matching cards in hand are unknown." };
  return { facts, rule: "You may meld after drawing. Keep a legal final discard; two completed canastas are needed to go out.",
    tip: side.opened ? "Build on your partner's melds. After opening, ordinary mixed melds need five naturals before adding wilds."
      : `Stage groups together to reach ${minimum} points, including a natural or wild meld. Expose any retained three before melding.` };
}

export function canastaGuidedRecap(moments: CanastaGuidedMoment[]) {
  const selected = new Set([moments.find(moment => moment.opened || moment.action.type === "pickup") ?? moments[0],
    moments.find(moment => moment.canastasAfter > moment.canastasBefore), moments.at(-1)]);
  return moments.flatMap((moment, index) => selected.has(moment) ? [{ moment, decision: index + 1 }] : []);
}
