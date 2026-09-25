import type { Card } from "./types";
import { bestMeldLayout, deadwoodValue, rummyRank } from "./rummyMelds";
import { otherGinPlayer, transitionGinSession, type GinAction, type GinSession } from "./ginRummySession";

export type GinObservation = { hand: Card[]; upcard: Card | undefined; opponentKnown: Card[]; blockedDiscard: string;
  phase: "offer" | "draw" | "discard"; forcedStock: boolean };
const connections = (hand: Card[]) => hand.reduce((sum, card, index) => sum + hand.slice(index + 1).filter(other =>
  other.rank === card.rank || other.suit === card.suit && Math.abs(rummyRank(other) - rummyRank(card)) <= 2).length, 0);

export function ginDiscardChoices(hand: Card[], blocked = "", opponentKnown: Card[] = []) {
  return hand.filter(card => card.id !== blocked).map(card => {
    const remaining = hand.filter(c => c.id !== card.id), layout = bestMeldLayout(remaining);
    const danger = opponentKnown.filter(c => c.rank === card.rank || c.suit === card.suit && Math.abs(rummyRank(c) - rummyRank(card)) <= 2).length;
    return { card, layout, value: layout.points * 100 - connections(remaining) * 3 + danger * 12 - deadwoodValue(card) };
  }).sort((a, b) => a.value - b.value || a.card.id.localeCompare(b.card.id));
}
export function chooseGinAction(position: GinObservation): GinAction {
  if (position.phase === "discard") {
    const best = ginDiscardChoices(position.hand, position.blockedDiscard, position.opponentKnown)[0];
    return { type: "discard", cardId: best.card.id, knock: best.layout.points <= 10 };
  }
  if (position.upcard && !position.forcedStock) {
    const next = ginDiscardChoices([...position.hand, position.upcard], position.upcard.id)[0];
    if (next.layout.points < bestMeldLayout(position.hand).points) return { type: "draw", source: "discard" };
  }
  return position.phase === "offer" ? { type: "pass" } : { type: "draw", source: "stock" };
}
export function ginObservation(session: GinSession): GinObservation {
  const hand = session.hand;
  if (hand.phase === "complete") throw Error("This hand is complete.");
  return { hand: hand.hands[hand.turn], upcard: hand.discards.at(-1), opponentKnown: hand.known[otherGinPlayer(hand.turn)],
    blockedDiscard: hand.blockedDiscard, phase: hand.phase, forcedStock: hand.forcedStock };
}
export function advanceGinOpponent(session: GinSession): GinSession {
  let next = session;
  // An opponent turn is at most one opening decision, one draw and one discard.
  for (let count = 0; count < 3 && next.hand.turn === 1 && next.hand.phase !== "complete"; count++) {
    next = transitionGinSession(next, chooseGinAction(ginObservation(next)));
  }
  return next;
}
