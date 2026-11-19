import type { Card, DominoHandState } from "./types";
import { dominoSuits } from "./dominoDeal";
import { isLegalDominoPlacement } from "./dominoRules";
import { cardRank } from "./trickTakingRules";

export function legalDominoCards(state: DominoHandState, player: number): Card[] {
  return state.hands[player].filter(card => isLegalDominoPlacement(state.layout[dominoSuits.indexOf(card.suit)], card, state.startRank ?? "7"));
}

export type DominoObservation = { hand: Card[]; layout: Card[][]; startRank: string };

export function dominoObservation(state: DominoHandState): DominoObservation {
  return { hand: state.hands[state.currentPlayerIndex], layout: state.layout, startRank: state.startRank ?? "7" };
}

export function chooseDominoCard(position: DominoObservation): Card | undefined {
  const { hand: own, layout, startRank } = position;
  const legal = own.filter(card => isLegalDominoPlacement(layout[dominoSuits.indexOf(card.suit)], card, startRank));
  const priority = (card: Card) => {
    const after = layout.map(lane => [...lane]);
    after[dominoSuits.indexOf(card.suit)].push(card);
    return [own.filter(c => c.id !== card.id && isLegalDominoPlacement(after[dominoSuits.indexOf(c.suit)], c, startRank)).length,
      own.filter(c => c.suit === card.suit).length,
      -cardRank(card), -dominoSuits.indexOf(card.suit)];
  };
  return legal.map(card => ({ card, priority: priority(card) })).sort((a, b) => {
    for (let i = 0; i < a.priority.length; i++) {
      const difference = b.priority[i] - a.priority[i];
      if (difference) return difference;
    }
    return 0;
  })[0]?.card;
}
