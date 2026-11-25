import { beloteCardRank, beloteCardPoints, beloteDeck, beloteSuits, beloteSide, beloteTrickWinner, legalBeloteCards } from "./beloteRules";
import { belotePosition, transitionBeloteSession, type BelotePosition, type BeloteSession, type BeloteAction } from "./beloteSession";
import type { Card, Suit } from "./types";

export function beloteTakeStrength(cards: Card[], trump: Suit): number {
  return cards.reduce((sum, card) => sum + (card.suit === trump
    ? 1 + (card.rank === "J" ? 2 : card.rank === "9" ? 1.3 : card.rank === "A" ? 0.8 : 0)
    : card.rank === "A" ? 0.8 : card.rank === "10" && cards.some(other => other.suit === card.suit && other.rank === "A") ? 0.4 : 0), 0);
}
export function beloteTakeChoices(position: Pick<BelotePosition, "hand" | "upcard" | "round">) {
  const suits = position.round === 1 ? [position.upcard.suit] : beloteSuits.filter(suit => suit !== position.upcard.suit);
  return suits.map(trump => ({ trump, strength: beloteTakeStrength([...position.hand, position.upcard], trump) })).sort((a, b) => b.strength - a.strength);
}
export function chooseBeloteAction(position: BelotePosition): BeloteAction {
  if (position.viewer !== position.turn) throw Error("Belote policy must act for its viewer.");
  if (position.phase === "calling") {
    const best = beloteTakeChoices(position)[0];
    return best.strength >= 5 ? { type: "take", trump: best.trump } : { type: "pass" };
  }
  if (position.phase !== "playing" || !position.contract) throw Error("No Belote decision in this phase.");
  const trump = position.contract.trump;
  const cards = [...legalBeloteCards(position.hand, position.currentTrick, trump, position.viewer)];
  const cost = (card: Card) => beloteCardPoints(card, trump) + beloteCardRank(card, trump) / 10 + (card.suit === trump ? 25 : 0);
  cards.sort((a, b) => cost(a) - cost(b) || a.id.localeCompare(b.id));
  const seen = new Set([...position.hand, ...position.currentTrick.map(play => play.card),
    ...position.completedTricks.flatMap(trick => trick.cards.map(play => play.card))].map(card => card.id));
  const unseen = beloteDeck().filter(card => !seen.has(card.id));
  const master = (card: Card) => !unseen.some(other => other.suit === card.suit && beloteCardRank(other, trump) > beloteCardRank(card, trump));
  const winner = beloteTrickWinner(position.currentTrick, trump);
  const winning = cards.filter(card => beloteTrickWinner([...position.currentTrick, { seat: position.viewer, card }], trump) === position.viewer);
  let chosen = cards[0];
  if (!position.currentTrick.length) chosen = cards.find(card => card.suit !== trump && master(card))
    ?? cards.find(card => card.suit === trump && master(card) && beloteSide(position.contract!.taker) === beloteSide(position.viewer)) ?? cards[0];
  else if (winner !== undefined && beloteSide(winner) === beloteSide(position.viewer)) {
    const held = position.currentTrick.find(play => play.seat === winner)!.card;
    const secure = position.currentTrick.length === 3 || held.suit === trump && master(held);
    if (secure) chosen = [...cards].filter(card => card.suit !== trump).sort((a, b) => beloteCardPoints(b, trump) - beloteCardPoints(a, trump))[0] ?? cards[0];
  } else chosen = winning[0] ?? cards[0];
  return { type: "play-card", cardId: chosen.id };
}
export function advanceBeloteOpponents(session: BeloteSession): BeloteSession {
  let next = session;
  while (["calling", "playing"].includes(next.hand.phase) && next.hand.turn !== 2) {
    next = transitionBeloteSession(next, chooseBeloteAction(belotePosition(next.hand, next.hand.turn)));
  }
  return next;
}
