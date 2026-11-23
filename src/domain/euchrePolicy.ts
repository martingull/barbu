import { cardRank } from "./trickTakingRules";
import { euchreCardRank, euchreDeck, euchreEffectiveSuit, euchreSide, euchreSuits, euchreTrickWinner, legalEuchreCards } from "./euchreRules";
import { euchrePosition, transitionEuchreSession, type EuchreAction, type EuchrePosition, type EuchreSession } from "./euchreSession";
import type { Card, Suit } from "./types";

export function euchreHandStrength(cards: Card[], trump: Suit): number {
  return cards.reduce((sum, card) => sum + (euchreEffectiveSuit(card, trump) === trump
    ? 1 + (euchreCardRank(card, trump) === 16 ? 1.2 : euchreCardRank(card, trump) === 15 ? 0.9 : card.rank === "A" ? 0.6 : 0)
    : card.rank === "A" ? 0.6 : 0), 0);
}
export function euchreCardCost(card: Card, trump: Suit): number {
  return euchreEffectiveSuit(card, trump) === trump ? 100 + euchreCardRank(card, trump) : cardRank(card);
}
export function euchreDiscardOrder(cards: Card[], trump: Suit): Card[] {
  return [...cards].sort((a, b) => {
    const quality = (discard: Card) => {
      const kept = cards.filter(card => card.id !== discard.id);
      const suits = new Set(kept.map(card => euchreEffectiveSuit(card, trump)));
      return euchreHandStrength(kept, trump) * 100 - suits.size * 5;
    };
    return quality(b) - quality(a) || euchreCardCost(a, trump) - euchreCardCost(b, trump) || a.id.localeCompare(b.id);
  });
}
export function euchreCallChoices(position: Pick<EuchrePosition, "hand" | "round" | "upcard" | "dealer" | "viewer">) {
  const suits = position.round === 1 ? [position.upcard.suit] : euchreSuits.filter(suit => suit !== position.upcard.suit);
  return suits.map(trump => {
    const cards = position.round === 1 && position.dealer === position.viewer
      ? [...position.hand, position.upcard].filter(card => card.id !== euchreDiscardOrder([...position.hand, position.upcard], trump)[0].id)
      : position.hand;
    return { trump, score: euchreHandStrength(cards, trump) };
  }).sort((a, b) => b.score - a.score);
}
export function euchreUnseenCards(position: EuchrePosition): Card[] {
  const seen = new Set([...position.hand, ...position.currentTrick.map(play => play.card),
    ...position.completedTricks.flatMap(trick => trick.cards.map(play => play.card)),
    ...(position.round === 2 ? [position.upcard] : [])].map(card => card.id));
  return euchreDeck().filter(card => !seen.has(card.id));
}
export function chooseEuchreAction(position: EuchrePosition): EuchreAction {
  if (position.viewer !== position.turn) throw Error("The Euchre policy can only act for its viewer.");
  if (position.phase === "calling") {
    const best = euchreCallChoices(position)[0];
    const outside = position.hand.filter(card => euchreEffectiveSuit(card, best.trump) !== best.trump);
    return best.score >= 4 ? { type: "call", trump: best.trump, alone: best.score >= 6.5 && outside.every(card => card.rank === "A") } : { type: "pass" };
  }
  if (position.phase === "discard" && position.contract) {
    const trump = position.contract.trump;
    const card = euchreDiscardOrder(position.hand, trump)[0];
    return { type: "discard", cardId: card.id };
  }
  if (position.phase === "playing" && position.contract) {
    const trump = position.contract.trump;
    const cards = [...legalEuchreCards(position.hand, position.currentTrick, trump)]
      .sort((a, b) => euchreCardCost(a, trump) - euchreCardCost(b, trump) || a.id.localeCompare(b.id));
    const unseen = euchreUnseenCards(position);
    const master = (card: Card) => !unseen.some(other => euchreEffectiveSuit(other, trump) === euchreEffectiveSuit(card, trump)
      && euchreCardRank(other, trump) > euchreCardRank(card, trump));
    const winner = euchreTrickWinner(position.currentTrick, trump);
    const partnerWinning = winner !== undefined && euchreSide(winner) === euchreSide(position.viewer);
    const winning = cards.filter(card => euchreTrickWinner([...position.currentTrick, { seat: position.viewer, card }], trump) === position.viewer);
    let card = cards[0];
    if (!position.currentTrick.length) {
      const trumps = cards.filter(card => euchreEffectiveSuit(card, trump) === trump);
      const drawTrump = euchreSide(position.contract.maker) === euchreSide(position.viewer) && trumps.length >= 2
        && unseen.some(card => euchreEffectiveSuit(card, trump) === trump);
      const outsideWinner = cards.find(card => euchreEffectiveSuit(card, trump) !== trump && master(card));
      card = drawTrump ? trumps.find(master) ?? outsideWinner ?? cards[0] : outsideWinner ?? cards[0];
    } else if (partnerWinning) {
      const last = position.currentTrick.length === (position.inactiveSeat === null ? 3 : 2);
      const held = position.currentTrick.find(play => play.seat === winner)!.card;
      const secure = last || euchreEffectiveSuit(held, trump) === trump && master(held);
      // Do not spend a card to beat a secure partner. Earlier in the trick,
      // promote a weak partner card with a master of the same effective suit.
      card = secure ? cards[0] : winning.find(candidate => euchreEffectiveSuit(candidate, trump) === euchreEffectiveSuit(held, trump) && master(candidate)) ?? cards[0];
    } else card = winning[0] ?? cards[0];
    return { type: "play-card", cardId: card.id };
  }
  throw Error("There is no Euchre card decision in this phase.");
}

export function advanceEuchreOpponents(session: EuchreSession): EuchreSession {
  let next = session;
  while (["calling", "discard", "playing"].includes(next.hand.phase) && next.hand.turn !== 2) {
    next = transitionEuchreSession(next, chooseEuchreAction(euchrePosition(next.hand, next.hand.turn)));
  }
  return next;
}
