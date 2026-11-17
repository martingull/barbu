import type { Card } from "./types";
import { advanceCanastaOpponents, canastaObservation, canastaPickupAction, suggestedCanastaMelds } from "./canastaPolicy";
import { completedCanastas, initialCanastaMinimum, canastaValue, isCanastaWild, canastaSpecial } from "./canastaRules";
import { canastaMeldChanges, type CanastaMeldChange } from "./canastaMeldPreview";
import { createCanastaSession, transitionCanastaSession, canastaNeedsThrees, canastaPickupBlockReason, legalCanastaDiscards,
  type CanastaAction, type CanastaSession } from "./canastaSession";

type PlayerAction = Exclude<CanastaAction, { type: "next" }>;
export type CanastaGuidedEvent = PlayerAction | { type: "continue" };
export type CanastaGuidedMoment = {
  action: PlayerAction; cards: Card[]; before: number; after: number;
  canastasBefore: number; canastasAfter: number; opened: boolean; pileCount: number;
  nextPhase: CanastaSession["hand"]["phase"]; needsThrees: boolean; exposedThree: boolean; endedHand: boolean;
  meldChanges: CanastaMeldChange[];
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
  const session = advanceCanastaOpponents(played);
  const moment: CanastaGuidedMoment = {
    action: played.events.at(-1) as PlayerAction, cards: visible, before: before.hands[0].length, after: after.hands[0].length,
    canastasBefore: completedCanastas(before.sides[0]), canastasAfter: completedCanastas(after.sides[0]),
    opened: !before.sides[0].opened && after.sides[0].opened, pileCount: before.discards.length,
    nextPhase: session.hand.phase,
    needsThrees: session.hand.phase !== "complete" && canastaNeedsThrees(session.hand),
    exposedThree: after.sides[0].threes.length > before.sides[0].threes.length,
    endedHand: after.phase === "complete",
    meldChanges: event.type === "meld" || event.type === "pickup" ? canastaMeldChanges(before.sides[0], after.sides[0]) : []
  };
  return { session, review: session.hand.phase === "complete" ? null : moment, moments: [...state.moments, moment] };
}

export function replayCanastaGuidedSession(state: CanastaGuidedSession) {
  return createCanastaGuidedSession(state.session.initialSeed);
}

// Guidance receives the same public-only projection as the opponent, never the deal.
export function canastaGuidance(observation: ReturnType<typeof canastaObservation>, selectedId = ""): {
  facts: string; title: string; rule: string; tip: string; meldChanges?: CanastaMeldChange[];
} {
  const hand = observation.hand, cards = hand.hands[0], side = hand.sides[0];
  const selected = cards.find(card => card.id === selectedId);
  const minimum = initialCanastaMinimum(observation.scores[0]);
  const facts = `You + Barbu: ${completedCanastas(side)} canastas (2 needed to go out). ${side.opened ? "Partnership opened." : `Opening: ${minimum} card points.`}`;
  const three = cards.find(card => card.rank === "3");
  if (three && (canastaNeedsThrees(hand) || selected?.rank === "3")) return { facts, title: "Expose a three",
    rule: hand.stock.length ? "Choose Expose three to replace it with a stock card." : "No replacement card remains. Expose three ends the hand.",
    tip: "Threes cannot be discarded or used in ordinary melds. Before opening, you may keep one only for a special straight." };
  if (hand.phase === "draw") {
    const pickup = canastaPickupAction(observation), top = hand.discards.at(-1);
    const blocked = canastaPickupBlockReason(hand);
    if (!hand.stock.length) return { facts, title: "The stock is empty",
      rule: blocked || (pickup ? "Take pile can continue the hand; End hand finishes it." : "Choose End hand to score the cards already played and held."),
      tip: blocked ? "Choose End hand to score the cards already played and held."
        : pickup ? "A legal pile pickup is available. Its buried cards join your hand and may help or cost points later."
        : "No pickup was suggested. You may check Take pile for your own qualifying opening; otherwise end the hand without a going-out bonus." };
    return { facts, title: "1. Draw or take the pile",
      rule: blocked || (pickup ? "Choose Draw stock, or Take pile to use your matching pair." : "Choose Draw stock to take one face-down card."),
      tip: blocked ? "Choose Draw stock instead. After drawing, meld if you wish, then discard."
        : pickup ? `Your natural pair can meld ${top!.label}. The other pile cards join your hand and cost points if left there.`
        : `To take ${top!.label}, you need two matching natural cards and a legal meld. Drawing stock keeps building your hand.` };
  }
  const special = hand.drewStock && !side.opened ? canastaSpecial(cards) : null;
  if (special) return { facts, title: "A special hand is available",
    rule: `Declare ${special.name} ends the hand for ${special.points} points.`,
    tip: "This award replaces your team's ordinary score. You may declare now or keep playing; melding first gives up this option." };
  if (cards.length === 1 && completedCanastas(side) >= 2 && legalCanastaDiscards(hand).length) return { facts, title: "3. Go out",
    rule: selected ? "Choose Go out to discard your last card and finish the hand." : "Select your last card, then choose Go out.",
    tip: "Two canastas are the minimum, not a guarantee of profit. Going out adds 100 points; unfinished penalty melds and cards left with Barbu still count against your team." };
  if (selected) {
    const allowed = legalCanastaDiscards(hand).some(card => card.id === selected.id);
    return { facts, title: "3. Choose a discard",
      rule: allowed ? `Discard ${selected.label} to end your turn.`
        : isCanastaWild(selected) ? "Keep this wild card. It cannot be discarded in this position."
        : cards.length === 1 ? "You cannot discard your last card before your team can go out."
        : "This card cannot start the empty pile while a permitted alternative remains.",
      tip: allowed ? `${selected.label} counts ${canastaValue(selected)} card points. Keep matching ranks for melds; an opponent may be able to take your discard.`
        : "Choose a highlighted legal discard instead, or build on your team's melds. Going out normally needs two canastas and a final discard." };
  }
  const groups = suggestedCanastaMelds(observation);
  if (groups.length) {
    const ids = new Set(groups.flatMap(group => group.cardIds));
    const points = cards.filter(card => ids.has(card.id)).reduce((sum, card) => sum + canastaValue(card), 0);
    return { facts, title: "2. Build your partnership's melds",
      rule: "Choose Meld cards to group matching ranks, or select a discard.",
      meldChanges: canastaMeldChanges(side, transitionCanastaSession(observation, { type: "meld", groups }).hand.sides[0]),
      tip: side.opened ? `One legal option adds ${ids.size} cards (${points} points) to your team's melds. Seven cards of a rank complete a canasta.`
        : points < minimum ? `A complete natural or wild canasta waives the ${minimum}-point minimum. Suggest groups shows a legal opening.`
        : `One legal opening totals ${points} card points (minimum ${minimum}). Suggest groups shows it; review the groups before confirming.` };
  }
  return { facts, title: "2. Meld, then discard",
    rule: three ? "Expose the retained three before melding, or select a legal discard."
      : "Meld cards if you can, or select a card and choose Discard.",
    tip: side.opened ? "A meld groups cards of one rank, not a run. Add to your shared melds; seven cards complete a canasta."
      : `Your team's first melds normally need ${minimum} card points. Keep useful pairs until groups qualify; you may discard without opening.` };
}

export function canastaGuidedRecap(moments: CanastaGuidedMoment[]) {
  const selected = new Set([moments.find(moment => moment.meldChanges.some(change => change.penaltyAfter || change.penaltyBefore))
    ?? moments.find(moment => moment.opened || moment.action.type === "pickup") ?? moments[0],
    moments.find(moment => moment.canastasAfter > moment.canastasBefore), moments.at(-1)]);
  return moments.flatMap((moment, index) => selected.has(moment) ? [{ moment, decision: index + 1 }] : []);
}
